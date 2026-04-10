import { ProjectMembersPanel } from '@/components/projects/project-members-panel';
import { auth } from '@/lib/auth';
import { canManageProjects, projectViewWhere } from '@/lib/project-access';
import type { ProjectMemberRow, UserPickRow } from '@/lib/project-types';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import {
  Banknote,
  CheckCircle2,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';
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

function fmtCurrency(n: number) {
  return n.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  });
}

function isOverdueProject(
  endDate: Date | null,
  status: string,
): boolean {
  if (!endDate) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end < today;
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const canManage = canManageProjects(role);

  const row = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, params.id),
    include: {
      client: { select: { companyName: true, logo: true } },
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

  const [taskTotal, taskDone] = await Promise.all([
    prisma.task.count({ where: { projectId: row.id } }),
    prisma.task.count({
      where: { projectId: row.id, status: 'done' },
    }),
  ]);

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

  const members: ProjectMemberRow[] = row.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    projectRole: m.projectRole,
    name: m.user.name,
    email: m.user.email,
    username: m.user.username,
    image: m.user.image,
  }));

  const taskProgress =
    taskTotal > 0
      ? Math.round((taskDone / taskTotal) * 100)
      : row.progress;

  const budget = row.budget;
  const actualCost = row.actualCost;
  const budgetUsed =
    budget > 0 ? Math.min(100, Math.round((actualCost / budget) * 100)) : 0;
  const isOverBudget = budget > 0 && actualCost > budget;
  const overdueMeta = isOverdueProject(row.endDate, row.status);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{
              color: row.coverColor,
              backgroundColor: `${row.coverColor}22`,
            }}
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {taskDone} / {taskTotal}
            </p>
            <p className="text-xs text-muted-foreground">Tugas selesai</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {taskProgress}%
            </p>
            <p className="text-xs text-muted-foreground">Progres</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
            <Users className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {members.length}
            </p>
            <p className="text-xs text-muted-foreground">Anggota tim</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <div
            className={cnIconWrap(isOverBudget)}
            style={
              !isOverBudget
                ? { color: '#0369a1', backgroundColor: '#e0f2fe' }
                : undefined
            }
          >
            <Banknote className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {budget > 0 ? `${budgetUsed}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Anggaran terpakai</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Progres keseluruhan
            </h2>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-border/80">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${Math.min(100, Math.max(0, taskProgress))}%`,
                  backgroundColor: row.coverColor,
                }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>
                {taskDone} tugas selesai
              </span>
              <span>{taskProgress}%</span>
            </div>
          </section>

          {budget > 0 ? (
            <section className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">
                Ringkasan anggaran
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Perkiraan</p>
                  <p className="mt-0.5 font-medium tabular-nums">
                    {fmtCurrency(budget)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Biaya aktual</p>
                  <p
                    className={
                      isOverBudget
                        ? 'mt-0.5 font-medium tabular-nums text-destructive'
                        : 'mt-0.5 font-medium tabular-nums'
                    }
                  >
                    {fmtCurrency(actualCost)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sisa</p>
                  <p
                    className={
                      isOverBudget
                        ? 'mt-0.5 font-medium tabular-nums text-destructive'
                        : 'mt-0.5 font-medium tabular-nums text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {fmtCurrency(budget - actualCost)}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-border/80">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, budgetUsed)}%`,
                    backgroundColor: isOverBudget
                      ? 'var(--destructive)'
                      : row.coverColor,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {budgetUsed}% anggaran terpakai
                {isOverBudget ? ' — Melebihi anggaran!' : ''}
              </p>
            </section>
          ) : null}

          {row.tags.length > 0 ? (
            <section className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">Tag</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-4 lg:col-span-1">
          <section className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Detail proyek
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">ID</dt>
                <dd className="mt-0.5 font-mono text-foreground">{row.id}</dd>
              </div>
              {row.clientId && row.client ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Klien</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/clients/${row.clientId}`}
                      className="inline-flex max-w-full items-center gap-2 font-medium text-primary hover:underline"
                    >
                      {row.client.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.client.logo}
                          alt=""
                          className="h-8 w-8 rounded-md border border-border object-cover"
                        />
                      ) : null}
                      <span className="truncate">
                        {row.client.companyName}
                      </span>
                    </Link>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-muted-foreground">Mulai</dt>
                <dd className="mt-0.5">
                  {fmtDate(
                    row.startDate ? row.startDate.toISOString() : null,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Target selesai
                </dt>
                <dd
                  className={
                    overdueMeta
                      ? 'mt-0.5 text-destructive'
                      : 'mt-0.5 text-foreground'
                  }
                >
                  {fmtDate(row.endDate ? row.endDate.toISOString() : null)}
                </dd>
              </div>
              {row.actualEndDate ? (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Selesai aktual
                  </dt>
                  <dd className="mt-0.5">
                    {fmtDate(row.actualEndDate.toISOString())}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-muted-foreground">Dibuat</dt>
                <dd className="mt-0.5">
                  {fmtDate(row.createdAt.toISOString())}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Diperbarui</dt>
                <dd className="mt-0.5">
                  {fmtDate(row.updatedAt.toISOString())}
                </dd>
              </div>
              {row.parentId ? (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Proyek induk
                  </dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/projects/${row.parentId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.parent?.code ?? row.parentId}
                    </Link>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-muted-foreground">Sub-proyek</dt>
                <dd className="mt-0.5 tabular-nums">{subProjectCount}</dd>
              </div>
            </dl>
          </section>

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

function cnIconWrap(isOverBudget: boolean) {
  return isOverBudget
    ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
    : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg';
}
