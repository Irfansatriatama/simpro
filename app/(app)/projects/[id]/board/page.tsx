import { BoardClient } from '@/components/board/board-client';
import { auth } from '@/lib/auth';
import type { BoardTaskCard } from '@/lib/board-types';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';
import { TaskType } from '@prisma/client';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BoardPage({
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

  const raw = await prisma.task.findMany({
    where: {
      projectId,
      NOT: { type: TaskType.epic },
    },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      assignees: {
        include: { user: { select: { name: true } } },
      },
    },
  });

  const tasks: BoardTaskCard[] = raw.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    columnId: t.columnId,
    priority: t.priority,
    type: t.type,
    storyPoints: t.storyPoints,
    assigneeNames: t.assignees.map((a) => a.user.name),
  }));

  return (
    <BoardClient projectId={projectId} tasks={tasks} canEdit={canEdit} />
  );
}
