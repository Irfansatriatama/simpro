'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { ACTIVITY_ACTION, ACTIVITY_ENTITY } from '@/lib/activity-log-constants';
import { recordActivityLog } from '@/lib/activity-log-record';
import { isSprintStatus } from '@/lib/sprint-constants';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';

export type SprintActionResult = { ok: true } | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

function parseOptDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function requireSprintAccess(projectId: string) {
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

async function loadSprintInProject(sprintId: string, projectId: string) {
  return prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true, status: true, completedAt: true },
  });
}

function revalidateProjectSprintPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}/sprint`);
  revalidatePath(`/projects/${projectId}/backlog`);
  revalidatePath(`/projects/${projectId}`);
}

export async function createSprintAction(
  formData: FormData,
): Promise<SprintActionResult> {
  const projectId = trim(formData.get('projectId'));
  if (!projectId) return { ok: false, error: 'Proyek tidak valid.' };

  const ctx = await requireSprintAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat mengubah sprint.' };

  const name = trim(formData.get('name'));
  if (!name || name.length < 2) {
    return { ok: false, error: 'Nama sprint minimal 2 karakter.' };
  }

  const statusRaw = trim(formData.get('status')) || 'planning';
  if (!isSprintStatus(statusRaw)) {
    return { ok: false, error: 'Status sprint tidak valid.' };
  }

  const startDate = parseOptDate(trim(formData.get('startDate')));
  const endDate = parseOptDate(trim(formData.get('endDate')));
  if (startDate && endDate && endDate < startDate) {
    return { ok: false, error: 'Tanggal akhir tidak boleh sebelum tanggal mulai.' };
  }

  const completedAt =
    statusRaw === 'completed' ? new Date() : null;

  try {
    const s = await prisma.sprint.create({
      data: {
        projectId,
        name,
        goal: trim(formData.get('goal')) || null,
        status: statusRaw,
        startDate,
        endDate,
        retro: trim(formData.get('retro')) || null,
        completedAt,
      },
    });
    await recordActivityLog({
      projectId,
      entityType: ACTIVITY_ENTITY.sprint,
      entityId: s.id,
      entityName: s.name,
      action: ACTIVITY_ACTION.created,
      actorId: ctx.userId,
    });
    revalidateProjectSprintPaths(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menambah sprint.' };
  }
}

export async function updateSprintAction(
  formData: FormData,
): Promise<SprintActionResult> {
  const projectId = trim(formData.get('projectId'));
  const sprintId = trim(formData.get('sprintId'));
  if (!projectId || !sprintId) {
    return { ok: false, error: 'Data sprint tidak valid.' };
  }

  const ctx = await requireSprintAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat mengubah sprint.' };

  const existing = await loadSprintInProject(sprintId, projectId);
  if (!existing) return { ok: false, error: 'Sprint tidak ditemukan.' };

  const name = trim(formData.get('name'));
  if (!name || name.length < 2) {
    return { ok: false, error: 'Nama sprint minimal 2 karakter.' };
  }

  const statusRaw = trim(formData.get('status')) || 'planning';
  if (!isSprintStatus(statusRaw)) {
    return { ok: false, error: 'Status sprint tidak valid.' };
  }

  const startDate = parseOptDate(trim(formData.get('startDate')));
  const endDate = parseOptDate(trim(formData.get('endDate')));
  if (startDate && endDate && endDate < startDate) {
    return { ok: false, error: 'Tanggal akhir tidak boleh sebelum tanggal mulai.' };
  }

  let completedAt = existing.completedAt;
  if (statusRaw === 'completed' && !completedAt) {
    completedAt = new Date();
  }
  if (statusRaw !== 'completed') {
    completedAt = null;
  }

  try {
    await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name,
        goal: trim(formData.get('goal')) || null,
        status: statusRaw,
        startDate,
        endDate,
        retro: trim(formData.get('retro')) || null,
        completedAt,
      },
    });
    await recordActivityLog({
      projectId,
      entityType: ACTIVITY_ENTITY.sprint,
      entityId: sprintId,
      entityName: name,
      action: ACTIVITY_ACTION.updated,
      actorId: ctx.userId,
    });
    revalidateProjectSprintPaths(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui sprint.' };
  }
}

export async function deleteSprintAction(
  formData: FormData,
): Promise<SprintActionResult> {
  const projectId = trim(formData.get('projectId'));
  const sprintId = trim(formData.get('sprintId'));
  if (!projectId || !sprintId) {
    return { ok: false, error: 'Data sprint tidak valid.' };
  }

  const ctx = await requireSprintAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) return { ok: false, error: 'Anda tidak dapat menghapus sprint.' };

  const existing = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true, name: true },
  });
  if (!existing) return { ok: false, error: 'Sprint tidak ditemukan.' };

  try {
    await prisma.$transaction([
      prisma.task.updateMany({
        where: { sprintId },
        data: { sprintId: null },
      }),
      prisma.sprint.delete({ where: { id: sprintId } }),
    ]);
    await recordActivityLog({
      projectId,
      entityType: ACTIVITY_ENTITY.sprint,
      entityId: sprintId,
      entityName: existing.name,
      action: ACTIVITY_ACTION.deleted,
      actorId: ctx.userId,
    });
    revalidateProjectSprintPaths(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus sprint.' };
  }
}
