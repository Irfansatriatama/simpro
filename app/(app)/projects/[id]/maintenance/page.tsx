import { MaintenanceClient } from '@/components/maintenance/maintenance-client';
import { auth } from '@/lib/auth';
import type { ProjectMemberPick } from '@/lib/backlog-types';
import type { MaintenanceRow } from '@/lib/maintenance-types';
import {
  canManageProjects,
  projectViewWhere,
} from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const projectId = params.id;

  const project = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, projectId),
    select: { id: true },
  });
  if (!project) notFound();

  const memberRecord = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  const canEdit = canEditTasksInProject(role, !!memberRecord);
  const canViewReport = canManageProjects(role);

  const [memberRows, maintenanceRawAll] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, username: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    }),
    prisma.maintenance.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      include: {
        picDevs: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const maintenanceRaw =
    role === 'developer'
      ? maintenanceRawAll.filter(
          (m) =>
            m.picDevs.length === 0 ||
            m.picDevs.some((p) => p.userId === userId),
        )
      : maintenanceRawAll;

  const members: ProjectMemberPick[] = memberRows.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    username: m.user.username,
  }));

  const rows: MaintenanceRow[] = maintenanceRaw.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    type: m.type,
    priority: m.priority,
    status: m.status,
    severity: m.severity,
    reportedBy: m.reportedBy,
    reportedDate: m.reportedDate ? m.reportedDate.toISOString() : null,
    resolvedDate: m.resolvedDate ? m.resolvedDate.toISOString() : null,
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    orderedBy: m.orderedBy,
    picClient: m.picClient,
    estimatedHours: m.estimatedHours,
    actualHours: m.actualHours,
    costEstimate: m.costEstimate,
    notes: m.notes,
    resolutionNotes: m.resolutionNotes,
    updatedAt: m.updatedAt.toISOString(),
    picDevs: m.picDevs.map((p) => ({
      userId: p.user.id,
      name: p.user.name,
    })),
  }));

  return (
    <MaintenanceClient
      projectId={projectId}
      rows={rows}
      members={members}
      canEdit={canEdit}
      canViewReport={canViewReport}
      currentUserId={userId}
      userRole={role}
    />
  );
}
