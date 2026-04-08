'use server';

import { revalidatePath } from 'next/cache';
import {
  Priority,
  TaskStatus,
  TaskType,
} from '@prisma/client';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { projectViewWhere } from '@/lib/project-access';
import { getUserRole } from '@/lib/session-user';
import { prisma } from '@/lib/prisma';
import { ACTIVITY_ACTION, ACTIVITY_ENTITY } from '@/lib/activity-log-constants';
import { recordActivityLog } from '@/lib/activity-log-record';
import { boardColumnIdForStatus } from '@/lib/board-columns';
import { canEditTasksInProject } from '@/lib/task-access';

export type TaskActionResult = { ok: true } | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

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
