'use server';

import { revalidatePath } from 'next/cache';
import { Prisma, TaskStatus } from '@prisma/client';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import {
  defaultProjectBoardColumns,
  getBoardColumnsForProject,
  type ProjectBoardColumn,
} from '@/lib/project-board-columns';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';

export type BoardLayoutResult = { ok: true } | { ok: false; error: string };

const TASK_STATUSES = new Set<string>(Object.values(TaskStatus));

function isTaskStatus(s: string): s is TaskStatus {
  return TASK_STATUSES.has(s);
}

function parseLayout(raw: unknown): ProjectBoardColumn[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (raw.length > 24) return null;
  const out: ProjectBoardColumn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    const st = typeof o.status === 'string' ? o.status : '';
    if (id.length < 1 || id.length > 64) return null;
    if (title.length < 1 || title.length > 80) return null;
    if (!isTaskStatus(st)) return null;
    out.push({ id, title, status: st });
  }
  return out.length > 0 ? out : null;
}

async function requireBoardLayoutEdit(projectId: string) {
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
  if (!canEditTasksInProject(role, !!member)) return null;
  return { userId };
}

function revalidateBoardPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}/board`);
  revalidatePath(`/projects/${projectId}/backlog`);
  revalidatePath(`/projects/${projectId}/sprint`);
}

export async function saveProjectBoardLayoutAction(
  projectId: string,
  columns: unknown,
): Promise<BoardLayoutResult> {
  const ctx = await requireBoardLayoutEdit(projectId);
  if (!ctx) {
    return { ok: false, error: 'Tidak punya akses mengubah kolom board.' };
  }

  const next = parseLayout(columns);
  if (!next) {
    return { ok: false, error: 'Format kolom board tidak valid.' };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { boardColumns: true },
  });
  if (!project) return { ok: false, error: 'Proyek tidak ditemukan.' };

  const old = getBoardColumnsForProject(project.boardColumns);
  const newIds = new Set(next.map((c) => c.id));
  const removed = old.filter((c) => !newIds.has(c.id));

  for (const r of removed) {
    const fallback = next.find((c) => c.status === r.status) ?? next[0];
    await prisma.task.updateMany({
      where: { projectId, columnId: r.id },
      data: { columnId: fallback.id, status: fallback.status },
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { boardColumns: next as object[] },
  });

  revalidateBoardPaths(projectId);
  return { ok: true };
}

export async function resetProjectBoardLayoutAction(
  projectId: string,
): Promise<BoardLayoutResult> {
  const ctx = await requireBoardLayoutEdit(projectId);
  if (!ctx) {
    return { ok: false, error: 'Tidak punya akses mengubah kolom board.' };
  }

  const defaults = defaultProjectBoardColumns();
  await prisma.project.update({
    where: { id: projectId },
    data: { boardColumns: Prisma.DbNull },
  });

  for (const d of defaults) {
    await prisma.task.updateMany({
      where: { projectId, status: d.status },
      data: { columnId: d.id },
    });
  }

  revalidateBoardPaths(projectId);
  return { ok: true };
}
