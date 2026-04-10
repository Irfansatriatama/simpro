import { MaintenanceReportClient } from '@/components/maintenance/maintenance-report-client';
import { auth } from '@/lib/auth';
import type { MaintenanceReportRow } from '@/lib/maintenance-types';
import { getOrgSettings } from '@/lib/org-settings';
import {
  canManageProjects,
  projectViewWhere,
} from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MaintenanceReportPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const projectId = params.id;

  if (!canManageProjects(role)) {
    redirect(`/projects/${projectId}/maintenance`);
  }

  const project = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, projectId),
    select: { id: true, code: true, name: true },
  });
  if (!project) notFound();

  const [org, subprojects] = await Promise.all([
    getOrgSettings(),
    prisma.project.findMany({
      where: { parentId: projectId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const scopeIds = [projectId, ...subprojects.map((s) => s.id)];

  const rawMaintenance = await prisma.maintenance.findMany({
    where: { projectId: { in: scopeIds } },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      projectId: true,
      title: true,
      type: true,
      status: true,
      priority: true,
      severity: true,
      reportedDate: true,
      dueDate: true,
      picClient: true,
    },
  });

  const projectIds = scopeIds;
  const projectRows = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true },
  });
  const projectNameById = Object.fromEntries(
    projectRows.map((p) => [p.id, p.name]),
  );

  const picIds = Array.from(
    new Set(
      rawMaintenance.map((m) => m.picClient).filter((x): x is string => !!x),
    ),
  );
  const picUsers =
    picIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: picIds } },
          select: { id: true, name: true },
        })
      : [];
  const memberNameByUserId = Object.fromEntries(
    picUsers.map((u) => [u.id, u.name]),
  );

  const rows: MaintenanceReportRow[] = rawMaintenance.map((m) => ({
    id: m.id,
    projectId: m.projectId,
    projectName: projectNameById[m.projectId] ?? m.projectId,
    title: m.title,
    type: m.type,
    status: m.status,
    priority: m.priority,
    severity: m.severity,
    reportedDate: m.reportedDate ? m.reportedDate.toISOString() : null,
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    picClient: m.picClient,
  }));

  return (
    <MaintenanceReportClient
      projectId={projectId}
      projectCode={project.code}
      projectName={project.name}
      orgDisplayName={org.systemName}
      subprojects={subprojects}
      memberNameByUserId={memberNameByUserId}
      rows={rows}
      showAggregateReportsLink={canManageProjects(role)}
    />
  );
}
