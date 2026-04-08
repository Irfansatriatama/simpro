'use server';

import { revalidatePath } from 'next/cache';
import { ACTIVITY_ACTION, ACTIVITY_ENTITY } from '@/lib/activity-log-constants';
import { recordActivityLog } from '@/lib/activity-log-record';
import { isAssetCategory, isAssetStatus } from '@/lib/asset-constants';
import { requireManagementSession } from '@/lib/management-auth';
import { prisma } from '@/lib/prisma';

export type AssetActionResult = { ok: true } | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

function parseOptionalDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseOptionalFloat(s: string): number | null {
  if (!s) return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

async function validateProjectId(
  projectId: string | null,
): Promise<AssetActionResult | null> {
  if (!projectId) return null;
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) return { ok: false, error: 'Proyek tidak valid.' };
  return null;
}

async function validateUserId(
  userId: string | null,
): Promise<AssetActionResult | null> {
  if (!userId) return null;
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return { ok: false, error: 'Penanggung jawab tidak valid.' };
  return null;
}

function revalidateAssetPaths(projectId: string | null) {
  revalidatePath('/assets');
  if (projectId) {
    revalidatePath(`/projects/${projectId}/log`);
  }
}

export async function createAssetAction(
  formData: FormData,
): Promise<AssetActionResult> {
  const session = await requireManagementSession();
  if (!session) {
    return { ok: false, error: 'Hanya administrator atau PM.' };
  }

  const name = trim(formData.get('name'));
  if (!name || name.length < 2) {
    return { ok: false, error: 'Nama aset minimal 2 karakter.' };
  }

  const category = trim(formData.get('category')) || 'hardware';
  if (!isAssetCategory(category)) {
    return { ok: false, error: 'Kategori tidak valid.' };
  }

  const status = trim(formData.get('status')) || 'available';
  if (!isAssetStatus(status)) {
    return { ok: false, error: 'Status tidak valid.' };
  }

  const projectIdRaw = trim(formData.get('projectId'));
  const projectId = projectIdRaw || null;
  const assignedToRaw = trim(formData.get('assignedTo'));
  const assignedTo = assignedToRaw || null;

  const errP = await validateProjectId(projectId);
  if (errP) return errP;
  const errU = await validateUserId(assignedTo);
  if (errU) return errU;

  const purchaseDate = parseOptionalDate(trim(formData.get('purchaseDate')));
  const warrantyExpiry = parseOptionalDate(
    trim(formData.get('warrantyExpiry')),
  );
  const purchasePrice = parseOptionalFloat(trim(formData.get('purchasePrice')));

  try {
    const created = await prisma.asset.create({
      data: {
        name,
        category,
        status,
        description: trim(formData.get('description')) || null,
        serialNumber: trim(formData.get('serialNumber')) || null,
        purchaseDate,
        purchasePrice,
        vendor: trim(formData.get('vendor')) || null,
        assignedTo,
        projectId,
        warrantyExpiry,
        notes: trim(formData.get('notes')) || null,
        image: trim(formData.get('image')) || null,
      },
    });

    await recordActivityLog({
      projectId,
      entityType: ACTIVITY_ENTITY.asset,
      entityId: created.id,
      entityName: created.name,
      action: ACTIVITY_ACTION.created,
      actorId: session.userId,
      metadata: { category: created.category, status: created.status },
    });

    revalidateAssetPaths(projectId);
    revalidatePath(`/assets/${created.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menambah aset.' };
  }
}

export async function updateAssetAction(
  formData: FormData,
): Promise<AssetActionResult> {
  const session = await requireManagementSession();
  if (!session) {
    return { ok: false, error: 'Hanya administrator atau PM.' };
  }

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Aset tidak valid.' };

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: 'Aset tidak ditemukan.' };

  const name = trim(formData.get('name'));
  if (!name || name.length < 2) {
    return { ok: false, error: 'Nama aset minimal 2 karakter.' };
  }

  const category = trim(formData.get('category')) || 'hardware';
  if (!isAssetCategory(category)) {
    return { ok: false, error: 'Kategori tidak valid.' };
  }

  const status = trim(formData.get('status')) || 'available';
  if (!isAssetStatus(status)) {
    return { ok: false, error: 'Status tidak valid.' };
  }

  const projectIdRaw = trim(formData.get('projectId'));
  const projectId = projectIdRaw || null;
  const assignedToRaw = trim(formData.get('assignedTo'));
  const assignedTo = assignedToRaw || null;

  const errP = await validateProjectId(projectId);
  if (errP) return errP;
  const errU = await validateUserId(assignedTo);
  if (errU) return errU;

  const purchaseDate = parseOptionalDate(trim(formData.get('purchaseDate')));
  const warrantyExpiry = parseOptionalDate(
    trim(formData.get('warrantyExpiry')),
  );
  const purchasePrice = parseOptionalFloat(trim(formData.get('purchasePrice')));

  try {
    await prisma.asset.update({
      where: { id },
      data: {
        name,
        category,
        status,
        description: trim(formData.get('description')) || null,
        serialNumber: trim(formData.get('serialNumber')) || null,
        purchaseDate,
        purchasePrice,
        vendor: trim(formData.get('vendor')) || null,
        assignedTo,
        projectId,
        warrantyExpiry,
        notes: trim(formData.get('notes')) || null,
        image: trim(formData.get('image')) || null,
      },
    });

    await recordActivityLog({
      projectId: projectId ?? existing.projectId,
      entityType: ACTIVITY_ENTITY.asset,
      entityId: id,
      entityName: name,
      action: ACTIVITY_ACTION.updated,
      actorId: session.userId,
    });

    revalidateAssetPaths(existing.projectId);
    revalidateAssetPaths(projectId);
    revalidatePath(`/assets/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui aset.' };
  }
}

export async function deleteAssetAction(
  formData: FormData,
): Promise<AssetActionResult> {
  const session = await requireManagementSession();
  if (!session) {
    return { ok: false, error: 'Hanya administrator atau PM.' };
  }

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Aset tidak valid.' };

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: 'Aset tidak ditemukan.' };

  try {
    await prisma.asset.delete({ where: { id } });

    await recordActivityLog({
      projectId: existing.projectId,
      entityType: ACTIVITY_ENTITY.asset,
      entityId: id,
      entityName: existing.name,
      action: ACTIVITY_ACTION.deleted,
      actorId: session.userId,
    });

    revalidateAssetPaths(existing.projectId);
    revalidatePath(`/assets/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus aset.' };
  }
}
