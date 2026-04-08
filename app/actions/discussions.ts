'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { isDiscussionType } from '@/lib/discussion-constants';
import {
  canManageProjects,
  projectViewWhere,
} from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';

export type DiscussionActionResult =
  | { ok: true }
  | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

async function requireDiscussionContext(projectId: string) {
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
  const canPost = canEditTasksInProject(role, !!member);
  const canModerate = canManageProjects(role);
  return { userId, role, canPost, canModerate };
}

function canEditOthersContent(
  ctx: NonNullable<Awaited<ReturnType<typeof requireDiscussionContext>>>,
  authorId: string,
): boolean {
  return ctx.userId === authorId || ctx.canModerate;
}

function revalidateDiscussion(projectId: string) {
  revalidatePath(`/projects/${projectId}/discussion`);
  revalidatePath(`/projects/${projectId}`);
}

export async function createDiscussionAction(
  formData: FormData,
): Promise<DiscussionActionResult> {
  const projectId = trim(formData.get('projectId'));
  if (!projectId) return { ok: false, error: 'Proyek tidak valid.' };

  const ctx = await requireDiscussionContext(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canPost) {
    return { ok: false, error: 'Anda tidak dapat membuat diskusi.' };
  }

  const title = trim(formData.get('title')) || null;
  const content = trim(formData.get('content'));
  if (content.length < 2) {
    return { ok: false, error: 'Isi diskusi minimal 2 karakter.' };
  }

  const typeRaw = trim(formData.get('type')) || 'general';
  if (!isDiscussionType(typeRaw)) {
    return { ok: false, error: 'Tipe diskusi tidak valid.' };
  }

  const pinned = ctx.canModerate && trim(formData.get('pinned')) === '1';

  try {
    await prisma.discussion.create({
      data: {
        projectId,
        title,
        content,
        type: typeRaw,
        authorId: ctx.userId,
        pinned,
      },
    });
    revalidateDiscussion(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal membuat diskusi.' };
  }
}

export async function updateDiscussionAction(
  formData: FormData,
): Promise<DiscussionActionResult> {
  const projectId = trim(formData.get('projectId'));
  const discussionId = trim(formData.get('discussionId'));
  if (!projectId || !discussionId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireDiscussionContext(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };

  const existing = await prisma.discussion.findFirst({
    where: { id: discussionId, projectId },
    select: { id: true, authorId: true },
  });
  if (!existing) return { ok: false, error: 'Diskusi tidak ditemukan.' };
  if (!canEditOthersContent(ctx, existing.authorId)) {
    return { ok: false, error: 'Anda tidak dapat mengedit diskusi ini.' };
  }

  const title = trim(formData.get('title')) || null;
  const content = trim(formData.get('content'));
  if (content.length < 2) {
    return { ok: false, error: 'Isi diskusi minimal 2 karakter.' };
  }

  const typeRaw = trim(formData.get('type')) || 'general';
  if (!isDiscussionType(typeRaw)) {
    return { ok: false, error: 'Tipe diskusi tidak valid.' };
  }

  let pinned: boolean | undefined;
  if (ctx.canModerate) {
    pinned = trim(formData.get('pinned')) === '1';
  }

  try {
    await prisma.discussion.update({
      where: { id: discussionId },
      data: {
        title,
        content,
        type: typeRaw,
        ...(pinned !== undefined ? { pinned } : {}),
      },
    });
    revalidateDiscussion(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui diskusi.' };
  }
}

export async function deleteDiscussionAction(
  formData: FormData,
): Promise<DiscussionActionResult> {
  const projectId = trim(formData.get('projectId'));
  const discussionId = trim(formData.get('discussionId'));
  if (!projectId || !discussionId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireDiscussionContext(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };

  const existing = await prisma.discussion.findFirst({
    where: { id: discussionId, projectId },
    select: { id: true, authorId: true },
  });
  if (!existing) return { ok: false, error: 'Diskusi tidak ditemukan.' };
  if (!canEditOthersContent(ctx, existing.authorId)) {
    return { ok: false, error: 'Anda tidak dapat menghapus diskusi ini.' };
  }

  try {
    await prisma.discussion.delete({ where: { id: discussionId } });
    revalidateDiscussion(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus diskusi.' };
  }
}

export async function toggleDiscussionPinAction(
  formData: FormData,
): Promise<DiscussionActionResult> {
  const projectId = trim(formData.get('projectId'));
  const discussionId = trim(formData.get('discussionId'));
  if (!projectId || !discussionId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireDiscussionContext(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canModerate) {
    return { ok: false, error: 'Hanya admin atau PM yang dapat menyematkan.' };
  }

  const existing = await prisma.discussion.findFirst({
    where: { id: discussionId, projectId },
    select: { id: true, pinned: true },
  });
  if (!existing) return { ok: false, error: 'Diskusi tidak ditemukan.' };

  try {
    await prisma.discussion.update({
      where: { id: discussionId },
      data: { pinned: !existing.pinned },
    });
    revalidateDiscussion(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mengubah sematan.' };
  }
}

export async function createDiscussionReplyAction(
  formData: FormData,
): Promise<DiscussionActionResult> {
  const projectId = trim(formData.get('projectId'));
  const discussionId = trim(formData.get('discussionId'));
  if (!projectId || !discussionId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireDiscussionContext(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canPost) {
    return { ok: false, error: 'Anda tidak dapat membalas diskusi.' };
  }

  const thread = await prisma.discussion.findFirst({
    where: { id: discussionId, projectId },
    select: { id: true },
  });
  if (!thread) return { ok: false, error: 'Diskusi tidak ditemukan.' };

  const content = trim(formData.get('content'));
  if (content.length < 1) {
    return { ok: false, error: 'Balasan tidak boleh kosong.' };
  }

  try {
    await prisma.discussionReply.create({
      data: {
        discussionId,
        authorId: ctx.userId,
        content,
      },
    });
    revalidateDiscussion(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mengirim balasan.' };
  }
}

export async function updateDiscussionReplyAction(
  formData: FormData,
): Promise<DiscussionActionResult> {
  const projectId = trim(formData.get('projectId'));
  const replyId = trim(formData.get('replyId'));
  if (!projectId || !replyId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireDiscussionContext(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };

  const reply = await prisma.discussionReply.findFirst({
    where: { id: replyId },
    include: {
      discussion: { select: { projectId: true } },
    },
  });
  if (!reply || reply.discussion.projectId !== projectId) {
    return { ok: false, error: 'Balasan tidak ditemukan.' };
  }
  if (!canEditOthersContent(ctx, reply.authorId)) {
    return { ok: false, error: 'Anda tidak dapat mengedit balasan ini.' };
  }

  const content = trim(formData.get('content'));
  if (content.length < 1) {
    return { ok: false, error: 'Balasan tidak boleh kosong.' };
  }

  try {
    await prisma.discussionReply.update({
      where: { id: replyId },
      data: { content },
    });
    revalidateDiscussion(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui balasan.' };
  }
}

export async function deleteDiscussionReplyAction(
  formData: FormData,
): Promise<DiscussionActionResult> {
  const projectId = trim(formData.get('projectId'));
  const replyId = trim(formData.get('replyId'));
  if (!projectId || !replyId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireDiscussionContext(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };

  const reply = await prisma.discussionReply.findFirst({
    where: { id: replyId },
    include: {
      discussion: { select: { projectId: true } },
    },
  });
  if (!reply || reply.discussion.projectId !== projectId) {
    return { ok: false, error: 'Balasan tidak ditemukan.' };
  }
  if (!canEditOthersContent(ctx, reply.authorId)) {
    return { ok: false, error: 'Anda tidak dapat menghapus balasan ini.' };
  }

  try {
    await prisma.discussionReply.delete({ where: { id: replyId } });
    revalidateDiscussion(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus balasan.' };
  }
}
