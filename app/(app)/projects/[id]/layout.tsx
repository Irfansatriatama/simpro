import { notFound, redirect } from 'next/navigation';

import { ProjectDetailBannerClient } from '@/components/projects/project-detail-banner-client';
import { ProjectSubnav } from '@/components/projects/project-subnav';
import { auth } from '@/lib/auth';
import { canManageProjects, projectListWhere, projectViewWhere } from '@/lib/project-access';
import type { ProjectDetailPayload } from '@/lib/project-types';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function ProjectIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
      client: { select: { companyName: true, logo: true } },
      parent: { select: { id: true, name: true, code: true } },
    },
  });

  if (!row) notFound();

  const subProjectCount = await prisma.project.count({
    where: { parentId: row.id },
  });

  const [clients, parents] = canManage
    ? await Promise.all([
        prisma.client.findMany({
          where: { status: 'active' },
          select: { id: true, companyName: true },
          orderBy: { companyName: 'asc' },
        }),
        prisma.project.findMany({
          where: {
            ...projectListWhere(userId, role),
            id: { not: row.id },
          },
          select: { id: true, code: true, name: true },
          orderBy: { code: 'asc' },
        }),
      ])
    : [[], []];

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

  const showMaintenance =
    (row.phase != null && ['running', 'maintenance'].includes(row.phase)) ||
    row.status === 'maintenance';

  return (
    <div className="space-y-4">
      <ProjectDetailBannerClient
        project={project}
        parentName={row.parent?.name ?? null}
        parentId={row.parentId}
        canManage={canManage}
        clients={clients}
        parents={parents}
      />

      <ProjectSubnav
        projectId={row.id}
        showMaintenance={showMaintenance}
        showLog={canManage}
      />

      <div className="pb-8">{children}</div>
    </div>
  );
}
