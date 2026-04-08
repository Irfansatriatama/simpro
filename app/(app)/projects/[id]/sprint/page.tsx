import { SprintClient } from '@/components/sprints/sprint-client';
import { auth } from '@/lib/auth';
import type { SprintRow } from '@/lib/sprint-types';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SprintPage({
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

  const raw = await prisma.sprint.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { tasks: true } } },
  });

  const sprints: SprintRow[] = raw.map((s) => ({
    id: s.id,
    name: s.name,
    goal: s.goal,
    status: s.status,
    startDate: s.startDate
      ? s.startDate.toISOString().slice(0, 10)
      : null,
    endDate: s.endDate ? s.endDate.toISOString().slice(0, 10) : null,
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
    retro: s.retro,
    taskCount: s._count.tasks,
  }));

  return (
    <SprintClient projectId={projectId} sprints={sprints} canEdit={canEdit} />
  );
}
