'use server';

import { revalidatePath } from 'next/cache';
import {
  MaintenanceStatus,
  MaintenanceType,
  Priority,
  Severity,
} from '@prisma/client';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  isMaintenanceStatus,
  isMaintenanceType,
  isSeverity,
} from '@/lib/maintenance-labels';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';

export type MaintenanceActionResult =
  | { ok: true }
  | { ok: false; error: string };

type MaintenanceFormPayload = {
  title: string;
  description: string | null;
  type: MaintenanceType;
  priority: Priority;
  status: MaintenanceStatus;
  severity: Severity | null;
  reportedBy: string | null;
  reportedDate: Date | null;
  dueDate: Date | null;
  orderedBy: string | null;
  picClient: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  costEstimate: number | null;
  notes: string | null;
  resolutionNotes: string | null;
  picDevIds: string[];
};

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

function parseOptDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseOptFloat(s: string): number | null {
  if (!trim(s)) return null;
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function readMulti(formData: FormData, key: string): string[] {
  const all = formData.getAll(key);
  return Array.from(
    new Set(all.map((v) => String(v).trim()).filter(Boolean)),
  );
}

async function requireMaintenanceAccess(projectId: string) {
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

function revalidateMaintenancePaths(projectId: string) {
  revalidatePath(`/projects/${projectId}/maintenance`);
  revalidatePath(`/projects/${projectId}/maintenance-report`);
  revalidatePath(`/projects/${projectId}`);
}

async function assertPicDevsInProject(
  projectId: string,
  userIds: string[],
): Promise<MaintenanceActionResult | null> {
  for (const uid of userIds) {
    const m = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: uid } },
    });
    if (!m) {
      return { ok: false, error: 'PIC developer harus anggota proyek.' };
    }
  }
  return null;
}

function resolvedLike(status: MaintenanceStatus): boolean {
  return (
    status === MaintenanceStatus.resolved ||
    status === MaintenanceStatus.closed
  );
}

function readMaintenancePayload(
  formData: FormData,
): MaintenanceFormPayload | { ok: false; error: string } {
  const title = trim(formData.get('title'));
  if (!title || title.length < 2) {
    return { ok: false, error: 'Judul minimal 2 karakter.' };
  }

  const typeRaw = trim(formData.get('type')) || MaintenanceType.bug;
  if (!isMaintenanceType(typeRaw)) {
    return { ok: false, error: 'Tipe maintenance tidak valid.' };
  }

  const statusRaw =
    trim(formData.get('status')) || MaintenanceStatus.open;
  if (!isMaintenanceStatus(statusRaw)) {
    return { ok: false, error: 'Status tidak valid.' };
  }

  const priorityRaw = trim(formData.get('priority')) || Priority.medium;
  if (!Object.values(Priority).includes(priorityRaw as Priority)) {
    return { ok: false, error: 'Prioritas tidak valid.' };
  }

  const sevRaw = trim(formData.get('severity'));
  let severity: Severity | null = null;
  if (sevRaw) {
    if (!isSeverity(sevRaw)) {
      return { ok: false, error: 'Severity tidak valid.' };
    }
    severity = sevRaw as Severity;
  }

  const picDevIds = readMulti(formData, 'picDevIds');

  return {
    title,
    description: trim(formData.get('description')) || null,
    type: typeRaw as MaintenanceType,
    priority: priorityRaw as Priority,
    status: statusRaw as MaintenanceStatus,
    severity,
    reportedBy: trim(formData.get('reportedBy')) || null,
    reportedDate: parseOptDate(trim(formData.get('reportedDate'))),
    dueDate: parseOptDate(trim(formData.get('dueDate'))),
    orderedBy: trim(formData.get('orderedBy')) || null,
    picClient: trim(formData.get('picClient')) || null,
    estimatedHours: parseOptFloat(String(formData.get('estimatedHours') ?? '')),
    actualHours: parseOptFloat(String(formData.get('actualHours') ?? '')),
    costEstimate: parseOptFloat(String(formData.get('costEstimate') ?? '')),
    notes: trim(formData.get('notes')) || null,
    resolutionNotes: trim(formData.get('resolutionNotes')) || null,
    picDevIds,
  };
}

export async function createMaintenanceAction(
  formData: FormData,
): Promise<MaintenanceActionResult> {
  const projectId = trim(formData.get('projectId'));
  if (!projectId) return { ok: false, error: 'Proyek tidak valid.' };

  const ctx = await requireMaintenanceAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat menambah tiket maintenance.' };
  }

  const payload = readMaintenancePayload(formData);
  if ('ok' in payload) return payload;

  const picErr = await assertPicDevsInProject(projectId, payload.picDevIds);
  if (picErr) return picErr;

  const reportedDate =
    payload.reportedDate ?? new Date();

  let resolvedDate: Date | null = parseOptDate(
    trim(formData.get('resolvedDate')),
  );
  if (!resolvedLike(payload.status)) {
    resolvedDate = null;
  } else if (!resolvedDate) {
    resolvedDate = new Date();
  }

  try {
    await prisma.$transaction(async (tx) => {
      const m = await tx.maintenance.create({
        data: {
          projectId,
          title: payload.title,
          description: payload.description,
          type: payload.type,
          priority: payload.priority,
          status: payload.status,
          severity: payload.severity,
          reportedBy: payload.reportedBy,
          reportedDate,
          resolvedDate,
          dueDate: payload.dueDate,
          orderedBy: payload.orderedBy,
          picClient: payload.picClient,
          estimatedHours: payload.estimatedHours,
          actualHours: payload.actualHours,
          costEstimate: payload.costEstimate,
          notes: payload.notes,
          resolutionNotes: payload.resolutionNotes,
        },
      });
      if (payload.picDevIds.length > 0) {
        await tx.maintenancePicDev.createMany({
          data: payload.picDevIds.map((userId) => ({
            maintenanceId: m.id,
            userId,
          })),
        });
      }
    });
    revalidateMaintenancePaths(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal membuat tiket maintenance.' };
  }
}

export async function updateMaintenanceAction(
  formData: FormData,
): Promise<MaintenanceActionResult> {
  const projectId = trim(formData.get('projectId'));
  const maintenanceId = trim(formData.get('maintenanceId'));
  if (!projectId || !maintenanceId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireMaintenanceAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat mengubah tiket maintenance.' };
  }

  const existing = await prisma.maintenance.findFirst({
    where: { id: maintenanceId, projectId },
    select: { id: true, resolvedDate: true },
  });
  if (!existing) {
    return { ok: false, error: 'Tiket tidak ditemukan.' };
  }

  const payload = readMaintenancePayload(formData);
  if ('ok' in payload) return payload;

  const picErr = await assertPicDevsInProject(projectId, payload.picDevIds);
  if (picErr) return picErr;

  let resolvedDate: Date | null = existing.resolvedDate;
  if (resolvedLike(payload.status)) {
    resolvedDate = resolvedDate ?? new Date();
  } else {
    resolvedDate = null;
  }
  const manualResolved = parseOptDate(trim(formData.get('resolvedDate')));
  if (manualResolved && resolvedLike(payload.status)) {
    resolvedDate = manualResolved;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.maintenance.update({
        where: { id: maintenanceId },
        data: {
          title: payload.title,
          description: payload.description,
          type: payload.type,
          priority: payload.priority,
          status: payload.status,
          severity: payload.severity,
          reportedBy: payload.reportedBy,
          reportedDate: payload.reportedDate,
          resolvedDate,
          dueDate: payload.dueDate,
          orderedBy: payload.orderedBy,
          picClient: payload.picClient,
          estimatedHours: payload.estimatedHours,
          actualHours: payload.actualHours,
          costEstimate: payload.costEstimate,
          notes: payload.notes,
          resolutionNotes: payload.resolutionNotes,
        },
      });
      await tx.maintenancePicDev.deleteMany({
        where: { maintenanceId },
      });
      if (payload.picDevIds.length > 0) {
        await tx.maintenancePicDev.createMany({
          data: payload.picDevIds.map((userId) => ({
            maintenanceId,
            userId,
          })),
        });
      }
    });
    revalidateMaintenancePaths(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui tiket maintenance.' };
  }
}

export async function deleteMaintenanceAction(
  formData: FormData,
): Promise<MaintenanceActionResult> {
  const projectId = trim(formData.get('projectId'));
  const maintenanceId = trim(formData.get('maintenanceId'));
  if (!projectId || !maintenanceId) {
    return { ok: false, error: 'Data tidak valid.' };
  }

  const ctx = await requireMaintenanceAccess(projectId);
  if (!ctx) return { ok: false, error: 'Tidak punya akses proyek.' };
  if (!ctx.canEdit) {
    return { ok: false, error: 'Anda tidak dapat menghapus tiket maintenance.' };
  }

  const existing = await prisma.maintenance.findFirst({
    where: { id: maintenanceId, projectId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: 'Tiket tidak ditemukan.' };
  }

  try {
    await prisma.maintenance.delete({ where: { id: maintenanceId } });
    revalidateMaintenancePaths(projectId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus tiket maintenance.' };
  }
}
