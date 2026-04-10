import { BoardClient } from '@/components/board/board-client';
import { auth } from '@/lib/auth';
import type {
  BoardMemberPick,
  BoardSprintPick,
  BoardTaskCard,
} from '@/lib/board-types';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { getBoardColumnsForProject } from '@/lib/project-board-columns';
import { canEditTasksInProject } from '@/lib/task-access';
import { TaskType } from '@prisma/client';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

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
    select: { id: true, name: true, boardColumns: true },
  });
  if (!project) notFound();

  const memberRecord = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  const canEdit = canEditTasksInProject(role, !!memberRecord);

  const [memberRows, sprintsRaw, raw] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    }),
    prisma.sprint.findMany({
      where: { projectId },
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: {
        projectId,
        NOT: { type: TaskType.epic },
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        sprint: { select: { id: true, name: true } },
        checklist: { select: { done: true } },
        _count: { select: { comments: true } },
      },
    }),
  ]);

  const members: BoardMemberPick[] = memberRows.map((m) => ({
    id: m.user.id,
    name: m.user.name,
  }));

  const sprints: BoardSprintPick[] = sprintsRaw.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const boardLayout = getBoardColumnsForProject(project.boardColumns);

  const tasks: BoardTaskCard[] = raw.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    columnId: t.columnId,
    priority: t.priority,
    type: t.type,
    storyPoints: t.storyPoints,
    tags: t.tags,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    sprintId: t.sprintId,
    sprintName: t.sprint?.name ?? null,
    checklistDone: t.checklist.filter((c) => c.done).length,
    checklistTotal: t.checklist.length,
    commentCount: t._count.comments,
    assignees: t.assignees.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      image: a.user.image,
    })),
  }));

  return (
    <Suspense
      fallback={
        <p className="py-8 text-center text-sm text-muted-foreground">
          Memuat board…
        </p>
      }
    >
      <BoardClient
        projectId={projectId}
        projectName={project.name}
        boardLayout={boardLayout}
        tasks={tasks}
        members={members}
        sprints={sprints}
        canEdit={canEdit}
      />
    </Suspense>
  );
}
