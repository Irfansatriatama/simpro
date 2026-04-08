'use server';

import { revalidatePath } from 'next/cache';
import {
  Priority,
  ProjectPhase,
  ProjectStatus,
} from '@prisma/client';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUserRole } from '@/lib/session-user';
import {
  canManageProjects,
  projectViewWhere,
} from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

export type ProjectActionResult = { ok: true } | { ok: false; error: string };

const CODE_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,31}$/;

async function sessionCtx() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    role: getUserRole(session),
  };
}

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

function parsePhase(
  s: string,
): ProjectPhase | null {
  if (!s) return null;
  if (Object.values(ProjectPhase).includes(s as ProjectPhase)) {
    return s as ProjectPhase;
  }
  return null;
}

export async function createProjectAction(
  formData: FormData,
): Promise<ProjectActionResult> {
  const ctx = await sessionCtx();
  if (!ctx) return { ok: false, error: 'Belum masuk.' };
  if (!canManageProjects(ctx.role)) {
    return { ok: false, error: 'Hanya admin atau PM yang dapat membuat proyek.' };
  }

  const code = trim(formData.get('code')).toUpperCase();
  const name = trim(formData.get('name'));
  if (!CODE_RE.test(code)) {
    return {
      ok: false,
      error: 'Kode 2–32 karakter: huruf, angka, underscore, tanda hubung.',
    };
  }
  if (!name || name.length < 2) {
    return { ok: false, error: 'Nama proyek minimal 2 karakter.' };
  }

  const statusRaw = trim(formData.get('status')) || 'planning';
  if (!Object.values(ProjectStatus).includes(statusRaw as ProjectStatus)) {
    return { ok: false, error: 'Status tidak valid.' };
  }
  const priorityRaw = trim(formData.get('priority')) || 'medium';
  if (!Object.values(Priority).includes(priorityRaw as Priority)) {
    return { ok: false, error: 'Prioritas tidak valid.' };
  }

  const clientId = trim(formData.get('clientId')) || null;
  const parentId = trim(formData.get('parentId')) || null;
  if (clientId) {
    const c = await prisma.client.findUnique({ where: { id: clientId } });
    if (!c) return { ok: false, error: 'Klien tidak ditemukan.' };
  }
  if (parentId) {
    const p = await prisma.project.findUnique({ where: { id: parentId } });
    if (!p) return { ok: false, error: 'Proyek induk tidak ditemukan.' };
  }

  const budget = Number(trim(formData.get('budget')) || '0');
  if (Number.isNaN(budget) || budget < 0) {
    return { ok: false, error: 'Anggaran tidak valid.' };
  }

  const coverColor = trim(formData.get('coverColor')) || '#2563EB';

  try {
    const project = await prisma.$transaction(async (tx) => {
      const pr = await tx.project.create({
        data: {
          code,
          name,
          description: trim(formData.get('description')) || null,
          status: statusRaw as ProjectStatus,
          phase: parsePhase(trim(formData.get('phase'))),
          priority: priorityRaw as Priority,
          clientId,
          parentId,
          startDate: parseOptDate(trim(formData.get('startDate'))),
          endDate: parseOptDate(trim(formData.get('endDate'))),
          budget,
          tags: parseTags(trim(formData.get('tags'))),
          coverColor,
          createdBy: ctx.userId,
        },
      });
      await tx.projectMember.create({
        data: {
          projectId: pr.id,
          userId: ctx.userId,
          projectRole: 'pm',
        },
      });
      return pr;
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${project.id}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique') || msg.includes('unique')) {
      return { ok: false, error: 'Kode proyek sudah dipakai.' };
    }
    return { ok: false, error: 'Gagal membuat proyek.' };
  }
}

export async function updateProjectAction(
  formData: FormData,
): Promise<ProjectActionResult> {
  const ctx = await sessionCtx();
  if (!ctx) return { ok: false, error: 'Belum masuk.' };
  if (!canManageProjects(ctx.role)) {
    return { ok: false, error: 'Hanya admin atau PM.' };
  }

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Proyek tidak valid.' };

  const exists = await prisma.project.findFirst({
    where: projectViewWhere(ctx.userId, ctx.role, id),
  });
  if (!exists) return { ok: false, error: 'Proyek tidak ditemukan.' };

  const code = trim(formData.get('code')).toUpperCase();
  const name = trim(formData.get('name'));
  if (!CODE_RE.test(code)) {
    return {
      ok: false,
      error: 'Kode 2–32 karakter: huruf, angka, underscore, tanda hubung.',
    };
  }
  if (!name || name.length < 2) {
    return { ok: false, error: 'Nama proyek minimal 2 karakter.' };
  }

  const statusRaw = trim(formData.get('status')) || 'planning';
  if (!Object.values(ProjectStatus).includes(statusRaw as ProjectStatus)) {
    return { ok: false, error: 'Status tidak valid.' };
  }
  const priorityRaw = trim(formData.get('priority')) || 'medium';
  if (!Object.values(Priority).includes(priorityRaw as Priority)) {
    return { ok: false, error: 'Prioritas tidak valid.' };
  }

  const clientId = trim(formData.get('clientId')) || null;
  const parentId = trim(formData.get('parentId')) || null;
  if (parentId === id) {
    return { ok: false, error: 'Proyek tidak boleh menjadi induk dirinya sendiri.' };
  }
  if (clientId) {
    const c = await prisma.client.findUnique({ where: { id: clientId } });
    if (!c) return { ok: false, error: 'Klien tidak ditemukan.' };
  }
  if (parentId) {
    const p = await prisma.project.findUnique({ where: { id: parentId } });
    if (!p) return { ok: false, error: 'Proyek induk tidak ditemukan.' };
  }

  const budget = Number(trim(formData.get('budget')) || '0');
  if (Number.isNaN(budget) || budget < 0) {
    return { ok: false, error: 'Anggaran tidak valid.' };
  }

  const actualCost = Number(trim(formData.get('actualCost')) || '0');
  if (Number.isNaN(actualCost) || actualCost < 0) {
    return { ok: false, error: 'Biaya aktual tidak valid.' };
  }

  const progress = Math.min(
    100,
    Math.max(0, Math.round(Number(trim(formData.get('progress')) || '0'))),
  );
  if (Number.isNaN(progress)) {
    return { ok: false, error: 'Progres tidak valid.' };
  }

  const coverColor = trim(formData.get('coverColor')) || '#2563EB';

  try {
    await prisma.project.update({
      where: { id },
      data: {
        code,
        name,
        description: trim(formData.get('description')) || null,
        status: statusRaw as ProjectStatus,
        phase: parsePhase(trim(formData.get('phase'))),
        priority: priorityRaw as Priority,
        clientId,
        parentId,
        startDate: parseOptDate(trim(formData.get('startDate'))),
        endDate: parseOptDate(trim(formData.get('endDate'))),
        actualEndDate: parseOptDate(trim(formData.get('actualEndDate'))),
        budget,
        actualCost,
        progress,
        tags: parseTags(trim(formData.get('tags'))),
        coverColor,
      },
    });
    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique') || msg.includes('unique')) {
      return { ok: false, error: 'Kode proyek sudah dipakai.' };
    }
    return { ok: false, error: 'Gagal memperbarui proyek.' };
  }
}

export async function addProjectMemberAction(
  formData: FormData,
): Promise<ProjectActionResult> {
  const ctx = await sessionCtx();
  if (!ctx) return { ok: false, error: 'Belum masuk.' };
  if (!canManageProjects(ctx.role)) {
    return { ok: false, error: 'Hanya admin atau PM.' };
  }

  const projectId = trim(formData.get('projectId'));
  const userId = trim(formData.get('userId'));
  const projectRole = trim(formData.get('projectRole')) || 'developer';
  if (!projectId || !userId) return { ok: false, error: 'Data tidak lengkap.' };

  const proj = await prisma.project.findFirst({
    where: projectViewWhere(ctx.userId, ctx.role, projectId),
  });
  if (!proj) return { ok: false, error: 'Proyek tidak ditemukan.' };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: 'Pengguna tidak ditemukan.' };

  try {
    await prisma.projectMember.create({
      data: { projectId, userId, projectRole },
    });
    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Pengguna sudah menjadi anggota.' };
  }
}

export async function removeProjectMemberAction(
  formData: FormData,
): Promise<ProjectActionResult> {
  const ctx = await sessionCtx();
  if (!ctx) return { ok: false, error: 'Belum masuk.' };
  if (!canManageProjects(ctx.role)) {
    return { ok: false, error: 'Hanya admin atau PM.' };
  }

  const projectId = trim(formData.get('projectId'));
  const userId = trim(formData.get('userId'));
  if (!projectId || !userId) return { ok: false, error: 'Data tidak lengkap.' };

  const proj = await prisma.project.findFirst({
    where: projectViewWhere(ctx.userId, ctx.role, projectId),
  });
  if (!proj) return { ok: false, error: 'Proyek tidak ditemukan.' };

  const count = await prisma.projectMember.count({ where: { projectId } });
  if (count <= 1) {
    return { ok: false, error: 'Minimal satu anggota proyek.' };
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updateProjectMemberRoleAction(
  formData: FormData,
): Promise<ProjectActionResult> {
  const ctx = await sessionCtx();
  if (!ctx) return { ok: false, error: 'Belum masuk.' };
  if (!canManageProjects(ctx.role)) {
    return { ok: false, error: 'Hanya admin atau PM.' };
  }

  const projectId = trim(formData.get('projectId'));
  const userId = trim(formData.get('userId'));
  const projectRole = trim(formData.get('projectRole')) || 'developer';
  if (!projectId || !userId) return { ok: false, error: 'Data tidak lengkap.' };

  const proj = await prisma.project.findFirst({
    where: projectViewWhere(ctx.userId, ctx.role, projectId),
  });
  if (!proj) return { ok: false, error: 'Proyek tidak ditemukan.' };

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { projectRole },
  });
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
