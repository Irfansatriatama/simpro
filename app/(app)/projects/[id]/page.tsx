import { ProjectDetailToolbar } from '@/components/projects/project-detail-toolbar';
import { ProjectMembersPanel } from '@/components/projects/project-members-panel';
import { auth } from '@/lib/auth';
import {
  canManageProjects,
  projectListWhere,
  projectViewWhere,
} from '@/lib/project-access';
import {
  PRIORITY_LABEL,
  PROJECT_PHASE_LABEL,
  PROJECT_STATUS_LABEL,
} from '@/lib/project-labels';
import type {
  ProjectDetailPayload,
  ProjectMemberRow,
  UserPickRow,
} from '@/lib/project-types';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const canManage = canManageProjects(role);

  const row = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, params.id),
    include: {
      client: { select: { companyName: true } },
      parent: { select: { code: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              image: true,
            },
          },
        },
        orderBy: { user: { name: 'asc' } },
      },
    },
  });

  if (!row) notFound();

  const subProjectCount = await prisma.project.count({
    where: { parentId: row.id },
  });

  const memberIds = row.members.map((m) => m.userId);
  const eligibleUsersRaw = canManage
    ? await prisma.user.findMany({
        where: {
          status: 'active',
          ...(memberIds.length > 0 ? { id: { notIn: memberIds } } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
        },
        orderBy: { name: 'asc' },
        take: 400,
      })
    : [];

  const eligibleUsers: UserPickRow[] = eligibleUsersRaw.map((u) => ({
    ...u,
  }));

  const clients = canManage
    ? await prisma.client.findMany({
        where: { status: 'active' },
        select: { id: true, companyName: true },
        orderBy: { companyName: 'asc' },
      })
    : [];

  const parents = canManage
    ? await prisma.project.findMany({
        where: {
          ...projectListWhere(userId, role),
          id: { not: row.id },
        },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      })
    : [];

  const project: ProjectDetailPayload['project'] = {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    phase: row.phase,
    priority: row.priority,
    progress: row.progress,
    coverColor: row.coverColor,
    budget: row.budget,
    actualCost: row.actualCost,
    tags: row.tags,
    clientId: row.clientId,
    clientName: row.client?.companyName ?? null,
    parentId: row.parentId,
    parentCode: row.parent?.code ?? null,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    actualEndDate: row.actualEndDate
      ? row.actualEndDate.toISOString()
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    subProjectCount,
  };

  const members: ProjectMemberRow[] = row.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    projectRole: m.projectRole,
    name: m.user.name,
    email: m.user.email,
    username: m.user.username,
    image: m.user.image,
  }));

  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="flex justify-end">
          <ProjectDetailToolbar
            project={project}
            clients={clients}
            parents={parents}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div
          className="h-2 rounded-full lg:col-span-3"
          style={{ backgroundColor: project.coverColor }}
        />

        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Ringkasan</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium text-foreground">
                  {PROJECT_STATUS_LABEL[project.status]}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fase</dt>
                <dd className="font-medium text-foreground">
                  {project.phase
                    ? PROJECT_PHASE_LABEL[project.phase]
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Prioritas</dt>
                <dd className="font-medium text-foreground">
                  {PRIORITY_LABEL[project.priority]}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Progres</dt>
                <dd className="font-medium text-foreground">
                  {project.progress}%
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Klien</dt>
                <dd className="font-medium text-foreground">
                  {project.clientId && project.clientName ? (
                    <Link
                      href={`/clients/${project.clientId}`}
                      className="text-primary hover:underline"
                    >
                      {project.clientName}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Proyek induk</dt>
                <dd className="font-medium text-foreground">
                  {project.parentId && project.parentCode ? (
                    <Link
                      href={`/projects/${project.parentId}`}
                      className="text-primary hover:underline"
                    >
                      {project.parentCode}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sub-proyek</dt>
                <dd className="font-medium text-foreground">
                  {project.subProjectCount} anak
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mulai</dt>
                <dd>{fmtDate(project.startDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Selesai (rencana)</dt>
                <dd>{fmtDate(project.endDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Selesai (aktual)</dt>
                <dd>{fmtDate(project.actualEndDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Anggaran</dt>
                <dd>
                  {project.budget.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Biaya aktual</dt>
                <dd>
                  {project.actualCost.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
            </dl>
            {project.description ? (
              <div className="mt-4 border-t border-border pt-4">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Deskripsi
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {project.description}
                </p>
              </div>
            ) : null}
            {project.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-border/60 px-2 py-0.5 text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <div className="lg:col-span-1">
          <ProjectMembersPanel
            projectId={row.id}
            members={members}
            eligibleUsers={eligibleUsers}
            canManage={canManage}
          />
        </div>
      </div>
    </div>
  );
}
