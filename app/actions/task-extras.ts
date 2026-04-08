'use server';

import { revalidatePath } from 'next/cache';

import { requireBacklogAccess } from '@/lib/backlog-access';
import { ACTIVITY_ENTITY } from '@/lib/activity-log-constants';
import {
  actorNotificationProfile,
  notifyUsers,
  projectNotifyContext,
} from '@/lib/notification-dispatch';
import { prisma } from '@/lib/prisma';

export type TaskExtrasPayload = {
  comments: Array<{
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
  }>;
  checklist: Array<{
    id: string;
    text: string;
    done: boolean;
    order: number;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    size: number | null;
    mimeType: string | null;
    createdAt: string;
  }>;
};

export type TaskExtrasFetchResult =
  | { ok: true; data: TaskExtrasPayload }
  | { ok: false; error: string };

export type TaskExtrasMutationResult =
  | { ok: true }
  | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function revalidateTaskPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}/backlog`);
  revalidatePath(`/projects/${projectId}/board`);
}

async function taskInProject(taskId: string, projectId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: {
      id: true,
      title: true,
      assignees: { select: { userId: true } },
      reporterId: true,
    },
  });
}

export async function fetchTaskExtrasAction(
  taskId: string,
  projectId: string,
): Promise<TaskExtrasFetchResult> {
  if (!taskId || !projectId) return { ok: false, error: 'Data tidak valid.' };

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  const [comments, checklist, attachments] = await Promise.all([
    prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.taskChecklist.findMany({
      where: { taskId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    }),
    prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const authorIds = Array.from(
    new Set(comments.map((c) => c.authorId)),
  );
  const authors =
    authorIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, name: true },
        });
  const nameById = Object.fromEntries(authors.map((a) => [a.id, a.name]));

  return {
    ok: true,
    data: {
      comments: comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        authorName: nameById[c.authorId] ?? 'Pengguna',
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
      checklist: checklist.map((i) => ({
        id: i.id,
        text: i.text,
        done: i.done,
        order: i.order,
      })),
      attachments: attachments.map((a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        size: a.size,
        mimeType: a.mimeType,
        createdAt: a.createdAt.toISOString(),
      })),
    },
  };
}

export async function addTaskCommentAction(
  formData: FormData,
): Promise<TaskExtrasMutationResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  const content = trim(formData.get('content'));
  if (!projectId || !taskId) return { ok: false, error: 'Data tidak valid.' };
  if (!content) return { ok: false, error: 'Komentar tidak boleh kosong.' };
  if (content.length > 5000) {
    return { ok: false, error: 'Komentar terlalu panjang (maks. 5000).' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat menambah komentar.' };
  }

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  await prisma.taskComment.create({
    data: { taskId, authorId: ctx.userId, content },
  });

  const actor = await actorNotificationProfile(ctx.userId);
  const { projectName } = await projectNotifyContext(projectId);
  const recipientIds = [
    ...task.assignees.map((a) => a.userId),
    ...(task.reporterId ? [task.reporterId] : []),
  ];
  await notifyUsers({
    recipientUserIds: recipientIds,
    actorId: ctx.userId,
    actorName: actor.name,
    actorAvatar: actor.image,
    entityType: ACTIVITY_ENTITY.task,
    entityId: taskId,
    entityName: task.title,
    action: 'commented',
    message: `${actor.name} mengomentari tugas "${task.title}".`,
    projectId,
    projectName,
  });

  revalidateTaskPaths(projectId);
  return { ok: true };
}

export async function deleteTaskCommentAction(
  formData: FormData,
): Promise<TaskExtrasMutationResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  const commentId = trim(formData.get('commentId'));
  if (!projectId || !taskId || !commentId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat menghapus komentar.' };
  }

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  const comment = await prisma.taskComment.findFirst({
    where: { id: commentId, taskId },
  });
  if (!comment) return { ok: false, error: 'Komentar tidak ditemukan.' };

  const isModerator = ctx.role === 'admin' || ctx.role === 'pm';
  if (comment.authorId !== ctx.userId && !isModerator) {
    return {
      ok: false,
      error: 'Hanya penulis atau admin/PM yang boleh menghapus.',
    };
  }

  await prisma.taskComment.delete({ where: { id: commentId } });
  revalidateTaskPaths(projectId);
  return { ok: true };
}

export async function addTaskChecklistItemAction(
  formData: FormData,
): Promise<TaskExtrasMutationResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  const text = trim(formData.get('text'));
  if (!projectId || !taskId) return { ok: false, error: 'Data tidak valid.' };
  if (!text || text.length > 500) {
    return { ok: false, error: 'Teks item 1–500 karakter.' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat mengubah checklist.' };
  }

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  const agg = await prisma.taskChecklist.aggregate({
    where: { taskId },
    _max: { order: true },
  });
  const nextOrder = (agg._max.order ?? -1) + 1;
  await prisma.taskChecklist.create({
    data: { taskId, text, order: nextOrder },
  });
  revalidateTaskPaths(projectId);
  return { ok: true };
}

export async function toggleTaskChecklistItemAction(
  formData: FormData,
): Promise<TaskExtrasMutationResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  const itemId = trim(formData.get('itemId'));
  const doneRaw = trim(formData.get('done'));
  if (!projectId || !taskId || !itemId) {
    return { ok: false, error: 'Data tidak valid.' };
  }
  const done = doneRaw === 'true' || doneRaw === 'on';

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat mengubah checklist.' };
  }

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  const row = await prisma.taskChecklist.findFirst({
    where: { id: itemId, taskId },
  });
  if (!row) return { ok: false, error: 'Item tidak ditemukan.' };

  await prisma.taskChecklist.update({
    where: { id: itemId },
    data: { done },
  });
  revalidateTaskPaths(projectId);
  return { ok: true };
}

export async function updateTaskChecklistItemTextAction(
  formData: FormData,
): Promise<TaskExtrasMutationResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  const itemId = trim(formData.get('itemId'));
  const text = trim(formData.get('text'));
  if (!projectId || !taskId || !itemId) {
    return { ok: false, error: 'Data tidak valid.' };
  }
  if (!text || text.length > 500) {
    return { ok: false, error: 'Teks item 1–500 karakter.' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat mengubah checklist.' };
  }

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  const row = await prisma.taskChecklist.findFirst({
    where: { id: itemId, taskId },
  });
  if (!row) return { ok: false, error: 'Item tidak ditemukan.' };

  await prisma.taskChecklist.update({
    where: { id: itemId },
    data: { text },
  });
  revalidateTaskPaths(projectId);
  return { ok: true };
}

export async function deleteTaskChecklistItemAction(
  formData: FormData,
): Promise<TaskExtrasMutationResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  const itemId = trim(formData.get('itemId'));
  if (!projectId || !taskId || !itemId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat mengubah checklist.' };
  }

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  const row = await prisma.taskChecklist.findFirst({
    where: { id: itemId, taskId },
  });
  if (!row) return { ok: false, error: 'Item tidak ditemukan.' };

  await prisma.taskChecklist.delete({ where: { id: itemId } });
  revalidateTaskPaths(projectId);
  return { ok: true };
}

export async function moveTaskChecklistItemAction(
  formData: FormData,
): Promise<TaskExtrasMutationResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  const itemId = trim(formData.get('itemId'));
  const direction = trim(formData.get('direction'));
  if (!projectId || !taskId || !itemId || (direction !== 'up' && direction !== 'down')) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat mengubah checklist.' };
  }

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  const items = await prisma.taskChecklist.findMany({
    where: { taskId },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx < 0) return { ok: false, error: 'Item tidak ditemukan.' };
  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= items.length) return { ok: true };

  const a = items[idx]!;
  const b = items[swapWith]!;
  await prisma.$transaction([
    prisma.taskChecklist.update({
      where: { id: a.id },
      data: { order: b.order },
    }),
    prisma.taskChecklist.update({
      where: { id: b.id },
      data: { order: a.order },
    }),
  ]);
  revalidateTaskPaths(projectId);
  return { ok: true };
}

export async function addTaskAttachmentAction(
  formData: FormData,
): Promise<TaskExtrasMutationResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  const name = trim(formData.get('name'));
  const url = trim(formData.get('url'));
  const sizeRaw = trim(formData.get('size'));
  const mimeType = trim(formData.get('mimeType')) || null;
  if (!projectId || !taskId) return { ok: false, error: 'Data tidak valid.' };
  if (!name || name.length > 200) {
    return { ok: false, error: 'Nama lampiran 1–200 karakter.' };
  }
  if (!url || !isValidHttpUrl(url)) {
    return { ok: false, error: 'URL harus http atau https.' };
  }

  let size: number | null = null;
  if (sizeRaw) {
    const n = Math.round(Number(sizeRaw));
    if (Number.isFinite(n) && n >= 0) size = n;
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat menambah lampiran.' };
  }

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  await prisma.taskAttachment.create({
    data: {
      taskId,
      name,
      url,
      size,
      mimeType: mimeType && mimeType.length <= 120 ? mimeType : null,
    },
  });
  revalidateTaskPaths(projectId);
  return { ok: true };
}

export async function deleteTaskAttachmentAction(
  formData: FormData,
): Promise<TaskExtrasMutationResult> {
  const projectId = trim(formData.get('projectId'));
  const taskId = trim(formData.get('taskId'));
  const attachmentId = trim(formData.get('attachmentId'));
  if (!projectId || !taskId || !attachmentId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireBacklogAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat menghapus lampiran.' };
  }

  const task = await taskInProject(taskId, projectId);
  if (!task) return { ok: false, error: 'Tugas tidak ditemukan.' };

  const row = await prisma.taskAttachment.findFirst({
    where: { id: attachmentId, taskId },
  });
  if (!row) return { ok: false, error: 'Lampiran tidak ditemukan.' };

  await prisma.taskAttachment.delete({ where: { id: attachmentId } });
  revalidateTaskPaths(projectId);
  return { ok: true };
}
