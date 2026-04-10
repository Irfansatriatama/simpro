'use server';

import { revalidatePath } from 'next/cache';
import { TaskType } from '@prisma/client';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { ACTIVITY_ACTION, ACTIVITY_ENTITY } from '@/lib/activity-log-constants';
import { recordActivityLog } from '@/lib/activity-log-record';
import {
  findBoardColumn,
  getBoardColumnsForProject,
} from '@/lib/project-board-columns';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';

import type { TaskActionResult } from '@/app/actions/tasks';

async function requireBacklogAccess(projectId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  const userId = session.user.id;
  const role = getUserRole(session);
  const project = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, projectId),
    select: { id: true },
  });
  if (!project) return null;
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  const canEdit = canEditTasksInProject(role, !!member);
  return { userId, role, canEdit };
}

export async function moveTaskOnBoardAction(payload: {
  projectId: string;
  taskId: string;
  columnId: string;
}): Promise<TaskActionResult> {
  const { projectId, taskId, columnId } = payload;
  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat mengubah board.' };

  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { boardColumns: true },
  });
  if (!project) return { ok: false, error: 'Proyek tidak ditemukan.' };

  const columns = getBoardColumnsForProject(project.boardColumns);
  const col = findBoardColumn(columns, columnId);
  if (!col) return { ok: false, error: 'Kolom tidak valid.' };

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };
  if (task.type === TaskType.epic) {
    return { ok: false, error: 'Epic tidak ditampilkan di board.' };
  }

  const currentCol = task.columnId;
  if (currentCol === columnId && task.status === col.status) {
    return { ok: true };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      columnId: col.id,
      status: col.status,
    },
  });

  await recordActivityLog({
    projectId,
    entityType: ACTIVITY_ENTITY.task,
    entityId: taskId,
    entityName: task.title,
    action: ACTIVITY_ACTION.board_moved,
    actorId: ctx.userId,
    metadata: {
      fromColumnId: currentCol,
      toColumnId: col.id,
      fromStatus: task.status,
      toStatus: col.status,
    },
  });

  revalidatePath(`/projects/${projectId}/board`);
  revalidatePath(`/projects/${projectId}/backlog`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
