import { BacklogClient } from '@/components/backlog/backlog-client';
import { auth } from '@/lib/auth';
import type {
  BacklogTaskRow,
  EpicPick,
  ProjectMemberPick,
  SprintPick,
} from '@/lib/backlog-types';
import { projectViewWhere } from '@/lib/project-access';
import { getBoardColumnsForProject } from '@/lib/project-board-columns';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';
import { TASK_TYPE_LABEL } from '@/lib/task-labels';
import { TaskType } from '@prisma/client';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function BacklogPage({
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
    select: { id: true, boardColumns: true },
  });
  if (!project) notFound();

  const memberRecord = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  const canEdit = canEditTasksInProject(role, !!memberRecord);

  const memberRows = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, name: true, email: true, username: true },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const assigneeMembers: ProjectMemberPick[] = memberRows.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    username: m.user.username,
  }));

  let reporterMembers: ProjectMemberPick[] = [...assigneeMembers];
  if (!reporterMembers.some((p) => p.id === userId) && (role === 'admin' || role === 'pm')) {
    const self = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, username: true },
    });
    if (self) {
      reporterMembers = [
        {
          id: self.id,
          name: self.name,
          email: self.email,
          username: self.username,
        },
        ...reporterMembers,
      ];
    }
  }

  const sprintsRaw = await prisma.sprint.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, status: true },
  });
  const sprints: SprintPick[] = sprintsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
  }));

  const epicsRaw = await prisma.task.findMany({
    where: { projectId, type: TaskType.epic },
    orderBy: { title: 'asc' },
    select: { id: true, title: true },
  });
  const epics: EpicPick[] = epicsRaw.map((e) => ({
    id: e.id,
    title: e.title,
  }));

  const rawTasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      assignees: {
        include: {
          user: { select: { name: true, username: true } },
        },
      },
      reporter: { select: { name: true } },
      sprint: { select: { id: true, name: true, status: true } },
      dependencies: {
        include: {
          dependencyTask: { select: { id: true, title: true } },
        },
      },
      _count: {
        select: { comments: true, checklist: true, attachments: true },
      },
    },
  });

  const epicIds = Array.from(
    new Set(
      rawTasks.map((t) => t.epicId).filter((x): x is string => Boolean(x)),
    ),
  );
  const epicTitleRows =
    epicIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: epicIds }, projectId },
          select: { id: true, title: true },
        })
      : [];
  const epicTitleMap = Object.fromEntries(
    epicTitleRows.map((e) => [e.id, e.title]),
  );

  const boardLayout = getBoardColumnsForProject(project.boardColumns);

  const tasks: BacklogTaskRow[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    status: t.status,
    columnId: t.columnId,
    priority: t.priority,
    storyPoints: t.storyPoints,
    sprintId: t.sprintId,
    sprintName: t.sprint?.name ?? null,
    epicId: t.epicId,
    epicTitle: t.epicId ? epicTitleMap[t.epicId] ?? null : null,
    reporterId: t.reporterId,
    reporterName: t.reporter?.name ?? null,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    tags: t.tags,
    timeLogged: t.timeLogged,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    assignees: t.assignees.map((a) => ({
      userId: a.userId,
      name: a.user.name,
      username: a.user.username,
    })),
    dependsOn: t.dependencies.map((d) => ({
      id: d.dependencyTask.id,
      title: d.dependencyTask.title,
    })),
    commentCount: t._count.comments,
    checklistCount: t._count.checklist,
    attachmentCount: t._count.attachments,
  }));

  const dependencyOptions = rawTasks.map((t) => ({
    id: t.id,
    title: `${t.title} (${TASK_TYPE_LABEL[t.type]})`,
  }));

  return (
    <Suspense
      fallback={
        <p className="py-8 text-center text-sm text-muted-foreground">
          Memuat backlog…
        </p>
      }
    >
      <BacklogClient
        projectId={projectId}
        boardLayout={boardLayout}
        tasks={tasks}
        assigneeMembers={assigneeMembers}
        reporterMembers={reporterMembers}
        sprints={sprints}
        epics={epics}
        dependencyOptions={dependencyOptions}
        canEdit={canEdit}
        currentUserId={userId}
        canModerateComments={role === 'admin' || role === 'pm'}
      />
    </Suspense>
  );
}
