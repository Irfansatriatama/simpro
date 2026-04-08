import { ReportsAccessDenied } from '@/components/reports/reports-access-denied';
import { ReportsClient } from '@/components/reports/reports-client';
import { auth } from '@/lib/auth';
import { buildReportsPayload } from '@/lib/reports-payload';
import {
  canManageProjects,
  projectViewWhere,
} from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function parseDateStart(s?: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(`${s.trim()}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDateEnd(s?: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(`${s.trim()}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const projectId = params.id;

  const project = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, projectId),
    select: { id: true, name: true },
  });
  if (!project) notFound();

  if (!canManageProjects(role)) {
    return <ReportsAccessDenied projectId={projectId} />;
  }

  const fromParam = searchParams?.from;
  const toParam = searchParams?.to;
  const fromStr = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  const toStr = Array.isArray(toParam) ? toParam[0] : toParam;
  const dateFrom = parseDateStart(fromStr);
  const dateTo = parseDateEnd(toStr);

  const [tasksRaw, sprintsRaw, maintenanceRaw, assetsRaw, memberRows] =
    await Promise.all([
      prisma.task.findMany({
        where: { projectId },
        select: {
          status: true,
          type: true,
          storyPoints: true,
          timeLogged: true,
          sprintId: true,
          updatedAt: true,
          completedAt: true,
          assignees: {
            select: {
              userId: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.sprint.findMany({
        where: { projectId },
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      }),
      prisma.maintenance.findMany({
        where: { projectId },
        select: {
          title: true,
          status: true,
          type: true,
          updatedAt: true,
        },
      }),
      prisma.asset.findMany({
        where: { projectId },
        select: { category: true, status: true },
      }),
      prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { user: { name: 'asc' } },
      }),
    ]);

  const members = memberRows.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
  }));

  const payload = buildReportsPayload(
    tasksRaw,
    sprintsRaw,
    maintenanceRaw,
    assetsRaw,
    members,
    dateFrom,
    dateTo,
  );

  return (
    <ReportsClient
      projectId={projectId}
      projectName={project.name}
      payload={payload}
      queryFrom={fromStr?.trim() ?? ''}
      queryTo={toStr?.trim() ?? ''}
    />
  );
}
