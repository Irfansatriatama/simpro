import { SprintClient } from '@/components/sprints/sprint-client';
import { auth } from '@/lib/auth';
import type { SprintTaskRef } from '@/lib/sprint-planning-types';
import type { SprintRow } from '@/lib/sprint-types';
import { projectViewWhere } from '@/lib/project-access';
import { getBoardColumnsForProject } from '@/lib/project-board-columns';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';
import { TaskType } from '@prisma/client';
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
    select: { id: true, name: true, boardColumns: true },
  });
  if (!project) notFound();

  const memberRecord = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  const canEdit = canEditTasksInProject(role, !!memberRecord);

  const [raw, tasksRaw] = await Promise.all([
    prisma.sprint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.task.findMany({
      where: { projectId, NOT: { type: TaskType.epic } },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        assignees: {
          include: { user: { select: { name: true } } },
          take: 4,
        },
      },
    }),
  ]);

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

  const boardLayout = getBoardColumnsForProject(project.boardColumns);

  const tasks: SprintTaskRef[] = tasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    sprintId: t.sprintId,
    status: t.status,
    storyPoints: t.storyPoints,
    priority: t.priority,
    columnId: t.columnId,
    assigneeNames: t.assignees.map((a) => a.user.name),
  }));

  return (
    <SprintClient
      projectId={projectId}
      projectName={project.name}
      boardLayout={boardLayout}
      sprints={sprints}
      tasks={tasks}
      canEdit={canEdit}
    />
  );
}
