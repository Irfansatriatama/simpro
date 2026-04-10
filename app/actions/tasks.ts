'use server';

import { revalidatePath } from 'next/cache';
import {
  Priority,
  TaskStatus,
  TaskType,
} from '@prisma/client';
import { requireBacklogAccess } from '@/lib/backlog-access';
import { prisma } from '@/lib/prisma';
import { ACTIVITY_ACTION, ACTIVITY_ENTITY } from '@/lib/activity-log-constants';
import { recordActivityLog } from '@/lib/activity-log-record';
import {
  actorNotificationProfile,
  notifyUsers,
} from '@/lib/notification-dispatch';
import { boardColumnIdForStatus } from '@/lib/board-columns';
import {
  firstColumnIdForStatus,
  getBoardColumnsForProject,
} from '@/lib/project-board-columns';

export type TaskActionResult = { ok: true } | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

function parseOptDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseTags(s: string): string[] {
  return s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function readMulti(formData: FormData, key: string): string[] {
  const all = formData.getAll(key);
  return Array.from(
    new Set(all.map((v) => String(v).trim()).filter(Boolean)),
  );
}

export async function createTaskAction(
  formData: FormData,
): Promise<TaskActionResult> {
  const projectId = trim(formData.get('projectId'));
  if (!projectId) return { ok: false, error: 'Proyek tidak valid.' };

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat menambah tugas.' };

  const title = trim(formData.get('title'));
  if (!title || title.length < 2) {
    return { ok: false, error: 'Judul minimal 2 karakter.' };
  }

  const typeRaw = trim(formData.get('type')) || 'task';
  if (!Object.values(TaskType).includes(typeRaw as TaskType)) {
    return { ok: false, error: 'Tipe tidak valid.' };
  }
  const type = typeRaw as TaskType;

  const statusRaw = trim(formData.get('status')) || 'backlog';
  if (!Object.values(TaskStatus).includes(statusRaw as TaskStatus)) {
    return { ok: false, error: 'Status tidak valid.' };
  }
  const status = statusRaw as TaskStatus;

  const priorityRaw = trim(formData.get('priority')) || 'medium';
  if (!Object.values(Priority).includes(priorityRaw as Priority)) {
    return { ok: false, error: 'Prioritas tidak valid.' };
  }

  const sprintId = trim(formData.get('sprintId')) || null;
  if (sprintId) {
    const sp = await prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });
    if (!sp) return { ok: false, error: 'Sprint tidak valid.' };
  }

  let epicId = trim(formData.get('epicId')) || null;
  if (type === TaskType.epic) epicId = null;
  if (epicId) {
    const ep = await prisma.task.findFirst({
      where: { id: epicId, projectId, type: TaskType.epic },
    });
    if (!ep) return { ok: false, error: 'Epic tidak valid.' };
  }

  const spoints = trim(formData.get('storyPoints'));
  const storyPoints =
    spoints === '' ? null : Math.round(Number(spoints));
  if (spoints !== '' && (Number.isNaN(storyPoints!) || storyPoints! < 0)) {
    return { ok: false, error: 'Story point tidak valid.' };
  }

  let reporterId = trim(formData.get('reporterId')) || ctx.userId;
  const rep = await prisma.user.findUnique({ where: { id: reporterId } });
  if (!rep) reporterId = ctx.userId;

  const assigneeIds = readMulti(formData, 'assigneeIds');
  for (const uid of assigneeIds) {
    const m = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: uid } },
    });
    if (!m) {
      return { ok: false, error: 'Semua penerima tugas harus anggota proyek.' };
    }
  }

  const dependencyIds = readMulti(formData, 'dependencyIds');

  try {
    const created = await prisma.$transaction(async (tx) => {
      const t = await tx.task.create({
        data: {
          projectId,
          title,
          description: trim(formData.get('description')) || null,
          type,
          status,
          priority: priorityRaw as Priority,
          storyPoints,
          sprintId,
          epicId,
          reporterId,
          startDate: parseOptDate(trim(formData.get('startDate'))),
          dueDate: parseOptDate(trim(formData.get('dueDate'))),
          completedAt: parseOptDate(trim(formData.get('completedAt'))),
          tags: parseTags(trim(formData.get('tags'))),
          timeLogged: Math.max(
            0,
            Math.round(Number(trim(formData.get('timeLogged')) || '0')) || 0,
          ),
          columnId: boardColumnIdForStatus(status),
        },
      });

      if (assigneeIds.length) {
        await tx.taskAssignee.createMany({
          data: assigneeIds.map((userId) => ({ taskId: t.id, userId })),
          skipDuplicates: true,
        });
      }

      for (const depId of dependencyIds) {
        if (depId === t.id) continue;
        const depTask = await tx.task.findFirst({
          where: { id: depId, projectId },
        });
        if (!depTask) continue;
        await tx.taskDependency.create({
          data: {
            dependentTaskId: t.id,
            dependencyTaskId: depId,
          },
        });
      }

      return { id: t.id, title: t.title };
    });

    await recordActivityLog({
      projectId,
      entityType: ACTIVITY_ENTITY.task,
      entityId: created.id,
      entityName: created.title,
      action: ACTIVITY_ACTION.created,
      actorId: ctx.userId,
    });

    if (assigneeIds.length > 0) {
      const actor = await actorNotificationProfile(ctx.userId);
      const proj = await prisma.project.findUnique({
        where: { id: projectId },
        select: { code: true, name: true },
      });
      const projectName = proj
        ? `${proj.code} — ${proj.name}`.slice(0, 200)
        : null;
      await notifyUsers({
        recipientUserIds: assigneeIds,
        actorId: ctx.userId,
        actorName: actor.name,
        actorAvatar: actor.image,
        entityType: ACTIVITY_ENTITY.task,
        entityId: created.id,
        entityName: created.title,
        action: ACTIVITY_ACTION.created,
        message: `${actor.name} menugaskan Anda pada tugas "${created.title}".`,
        projectId,
        projectName,
      });
    }

    revalidatePath(`/projects/${projectId}/backlog`);
    revalidatePath(`/projects/${projectId}/board`);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique') || msg.includes('unique')) {
      return { ok: false, error: 'Dependensi ganda tidak diizinkan.' };
    }
    return { ok: false, error: 'Gagal membuat tugas.' };
  }
}

export async function updateTaskAction(
  formData: FormData,
): Promise<TaskActionResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  if (!projectId || !taskId) return { ok: false, error: 'Data tidak valid.' };

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat mengubah tugas.' };

  const existing = await prisma.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!existing) return { ok: false, error: 'Tugas tidak ditemukan.' };

  const title = trim(formData.get('title'));
  if (!title || title.length < 2) {
    return { ok: false, error: 'Judul minimal 2 karakter.' };
  }

  const typeRaw = trim(formData.get('type')) || 'task';
  if (!Object.values(TaskType).includes(typeRaw as TaskType)) {
    return { ok: false, error: 'Tipe tidak valid.' };
  }
  const type = typeRaw as TaskType;

  const statusRaw = trim(formData.get('status')) || 'backlog';
  if (!Object.values(TaskStatus).includes(statusRaw as TaskStatus)) {
    return { ok: false, error: 'Status tidak valid.' };
  }
  const status = statusRaw as TaskStatus;

  const priorityRaw = trim(formData.get('priority')) || 'medium';
  if (!Object.values(Priority).includes(priorityRaw as Priority)) {
    return { ok: false, error: 'Prioritas tidak valid.' };
  }

  const sprintId = trim(formData.get('sprintId')) || null;
  if (sprintId) {
    const sp = await prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });
    if (!sp) return { ok: false, error: 'Sprint tidak valid.' };
  }

  let epicId = trim(formData.get('epicId')) || null;
  if (type === TaskType.epic) epicId = null;
  if (epicId) {
    if (epicId === taskId) {
      return { ok: false, error: 'Tugas tidak boleh menjadi epic dirinya sendiri.' };
    }
    const ep = await prisma.task.findFirst({
      where: { id: epicId, projectId, type: TaskType.epic },
    });
    if (!ep) return { ok: false, error: 'Epic tidak valid.' };
  }

  const spoints = trim(formData.get('storyPoints'));
  const storyPoints =
    spoints === '' ? null : Math.round(Number(spoints));
  if (spoints !== '' && (Number.isNaN(storyPoints!) || storyPoints! < 0)) {
    return { ok: false, error: 'Story point tidak valid.' };
  }

  let reporterId = trim(formData.get('reporterId')) || existing.reporterId || ctx.userId;
  const rep = await prisma.user.findUnique({ where: { id: reporterId } });
  if (!rep) reporterId = ctx.userId;

  const assigneeIds = readMulti(formData, 'assigneeIds');
  for (const uid of assigneeIds) {
    const m = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: uid } },
    });
    if (!m) {
      return { ok: false, error: 'Semua penerima tugas harus anggota proyek.' };
    }
  }

  const dependencyIds = readMulti(formData, 'dependencyIds');
  for (const depId of dependencyIds) {
    if (depId === taskId) {
      return { ok: false, error: 'Tugas tidak boleh bergantung pada dirinya sendiri.' };
    }
  }

  const prevAssigneeRows = await prisma.taskAssignee.findMany({
    where: { taskId },
    select: { userId: true },
  });
  const prevAssigneeSet = new Set(prevAssigneeRows.map((r) => r.userId));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          title,
          description: trim(formData.get('description')) || null,
          type,
          status,
          priority: priorityRaw as Priority,
          storyPoints,
          sprintId,
          epicId,
          reporterId,
          startDate: parseOptDate(trim(formData.get('startDate'))),
          dueDate: parseOptDate(trim(formData.get('dueDate'))),
          completedAt: parseOptDate(trim(formData.get('completedAt'))),
          tags: parseTags(trim(formData.get('tags'))),
          timeLogged: Math.max(
            0,
            Math.round(Number(trim(formData.get('timeLogged')) || '0')) || 0,
          ),
          columnId: boardColumnIdForStatus(status),
        },
      });

      await tx.taskAssignee.deleteMany({ where: { taskId } });
      if (assigneeIds.length) {
        await tx.taskAssignee.createMany({
          data: assigneeIds.map((userId) => ({ taskId, userId })),
          skipDuplicates: true,
        });
      }

      await tx.taskDependency.deleteMany({
        where: { dependentTaskId: taskId },
      });
      for (const depId of dependencyIds) {
        const depTask = await tx.task.findFirst({
          where: { id: depId, projectId },
        });
        if (!depTask) continue;
        await tx.taskDependency.create({
          data: {
            dependentTaskId: taskId,
            dependencyTaskId: depId,
          },
        });
      }
    });

    await recordActivityLog({
      projectId,
      entityType: ACTIVITY_ENTITY.task,
      entityId: taskId,
      entityName: title,
      action: ACTIVITY_ACTION.updated,
      actorId: ctx.userId,
    });

    const newlyAssigned = assigneeIds.filter((id) => !prevAssigneeSet.has(id));
    if (newlyAssigned.length > 0) {
      const actor = await actorNotificationProfile(ctx.userId);
      const proj = await prisma.project.findUnique({
        where: { id: projectId },
        select: { code: true, name: true },
      });
      const projectName = proj
        ? `${proj.code} — ${proj.name}`.slice(0, 200)
        : null;
      await notifyUsers({
        recipientUserIds: newlyAssigned,
        actorId: ctx.userId,
        actorName: actor.name,
        actorAvatar: actor.image,
        entityType: ACTIVITY_ENTITY.task,
        entityId: taskId,
        entityName: title,
        action: 'assigned',
        message: `${actor.name} menambahkan Anda sebagai penerima tugas "${title}".`,
        projectId,
        projectName,
      });
    }

    revalidatePath(`/projects/${projectId}/backlog`);
    revalidatePath(`/projects/${projectId}/board`);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique') || msg.includes('unique')) {
      return { ok: false, error: 'Dependensi ganda tidak diizinkan.' };
    }
    return { ok: false, error: 'Gagal memperbarui tugas.' };
  }
}

export async function assignTaskToSprintAction(payload: {
  projectId: string;
  taskId: string;
  sprintId: string | null;
}): Promise<TaskActionResult> {
  const { projectId, taskId, sprintId } = payload;
  if (!projectId || !taskId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat mengubah tugas.' };

  if (sprintId) {
    const sp = await prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
      select: { id: true },
    });
    if (!sp) return { ok: false, error: 'Sprint tidak valid.' };
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId, NOT: { type: TaskType.epic } },
    select: { id: true, title: true },
  });
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { sprintId },
    });
    await recordActivityLog({
      projectId,
      entityType: ACTIVITY_ENTITY.task,
      entityId: taskId,
      entityName: task.title,
      action: ACTIVITY_ACTION.updated,
      actorId: ctx.userId,
      metadata: { field: 'sprintId', sprintId },
    });
    revalidatePath(`/projects/${projectId}/backlog`);
    revalidatePath(`/projects/${projectId}/board`);
    revalidatePath(`/projects/${projectId}/sprint`);
    revalidatePath(`/projects/${projectId}/gantt`);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui sprint tugas.' };
  }
}

export async function bulkUpdateTasksAction(payload: {
  projectId: string;
  taskIds: string[];
  status?: TaskStatus;
  priority?: Priority;
  sprintId?: string | null;
}): Promise<TaskActionResult> {
  const { projectId, taskIds } = payload;
  if (!projectId || taskIds.length === 0) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat mengubah tugas.' };

  const data: {
    status?: TaskStatus;
    columnId?: string;
    completedAt?: Date | null;
    priority?: Priority;
    sprintId?: string | null;
  } = {};

  if (payload.status !== undefined) {
    const proj = await prisma.project.findFirst({
      where: { id: projectId },
      select: { boardColumns: true },
    });
    const cols = getBoardColumnsForProject(proj?.boardColumns);
    data.status = payload.status;
    data.columnId = firstColumnIdForStatus(cols, payload.status);
    data.completedAt =
      payload.status === TaskStatus.done ? new Date() : null;
  }
  if (payload.priority !== undefined) data.priority = payload.priority;
  if (payload.sprintId !== undefined) {
    if (payload.sprintId) {
      const sp = await prisma.sprint.findFirst({
        where: { id: payload.sprintId, projectId },
        select: { id: true },
      });
      if (!sp) return { ok: false, error: 'Sprint tidak valid.' };
    }
    data.sprintId = payload.sprintId;
  }

  if (
    data.status === undefined &&
    data.priority === undefined &&
    data.sprintId === undefined
  ) {
    return { ok: false, error: 'Tidak ada perubahan.' };
  }

  try {
    await prisma.task.updateMany({
      where: {
        projectId,
        id: { in: taskIds },
        NOT: { type: TaskType.epic },
      },
      data,
    });
    revalidatePath(`/projects/${projectId}/backlog`);
    revalidatePath(`/projects/${projectId}/board`);
    revalidatePath(`/projects/${projectId}/sprint`);
    revalidatePath(`/projects/${projectId}/gantt`);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui tugas secara massal.' };
  }
}

export async function bulkDeleteTasksAction(payload: {
  projectId: string;
  taskIds: string[];
}): Promise<TaskActionResult> {
  const { projectId, taskIds } = payload;
  if (!projectId || taskIds.length === 0) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat menghapus tugas.' };

  try {
    await prisma.task.deleteMany({
      where: {
        projectId,
        id: { in: taskIds },
        NOT: { type: TaskType.epic },
      },
    });
    revalidatePath(`/projects/${projectId}/backlog`);
    revalidatePath(`/projects/${projectId}/board`);
    revalidatePath(`/projects/${projectId}/gantt`);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus tugas secara massal.' };
  }
}

export async function deleteTaskAction(
  formData: FormData,
): Promise<TaskActionResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  if (!projectId || !taskId) return { ok: false, error: 'Data tidak valid.' };

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat menghapus tugas.' };

  const existing = await prisma.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!existing) return { ok: false, error: 'Tugas tidak ditemukan.' };

  await prisma.task.delete({ where: { id: taskId } });
  await recordActivityLog({
    projectId,
    entityType: ACTIVITY_ENTITY.task,
    entityId: taskId,
    entityName: existing.title,
    action: ACTIVITY_ACTION.deleted,
    actorId: ctx.userId,
  });
  revalidatePath(`/projects/${projectId}/backlog`);
  revalidatePath(`/projects/${projectId}/board`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
