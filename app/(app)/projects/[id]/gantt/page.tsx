import { GanttClient } from '@/components/gantt/gantt-client';
import { auth } from '@/lib/auth';
import type { GanttSprintRow, GanttTaskRow } from '@/lib/gantt-types';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { TaskType } from '@prisma/client';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function GanttPage({
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

  const [sprintsRaw, tasksRaw] = await Promise.all([
    prisma.sprint.findMany({
      where: { projectId },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.task.findMany({
      where: {
        projectId,
        NOT: { type: TaskType.epic },
      },
      orderBy: [{ dueDate: 'asc' }, { startDate: 'asc' }, { title: 'asc' }],
      include: {
        assignees: {
          include: {
            user: { select: { name: true } },
          },
          orderBy: { userId: 'asc' },
          take: 1,
        },
      },
    }),
  ]);

  const sprints: GanttSprintRow[] = sprintsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    startDate: s.startDate ? s.startDate.toISOString() : null,
    endDate: s.endDate ? s.endDate.toISOString() : null,
  }));

  const tasks: GanttTaskRow[] = tasksRaw.map((t) => {
    const first = t.assignees[0]?.user.name ?? '';
    return {
      id: t.id,
      title: t.title,
      type: t.type,
      status: t.status,
      priority: t.priority,
      sprintId: t.sprintId,
      startDate: t.startDate ? t.startDate.toISOString() : null,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      assigneeInitials: initialsFromName(first),
    };
  });

  return <GanttClient projectId={projectId} tasks={tasks} sprints={sprints} />;
}
