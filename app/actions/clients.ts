'use server';

import { revalidatePath } from 'next/cache';
import { isClientStatus } from '@/lib/client-types';
import { requireManagementSession } from '@/lib/management-auth';
import { prisma } from '@/lib/prisma';

export type ClientActionResult = { ok: true } | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

export async function createClientAction(
  formData: FormData,
): Promise<ClientActionResult> {
  if (!(await requireManagementSession())) {
    return { ok: false, error: 'Hanya administrator atau PM.' };
  }

  const companyName = trim(formData.get('companyName'));
  if (!companyName || companyName.length < 2) {
    return { ok: false, error: 'Nama perusahaan minimal 2 karakter.' };
  }

  const status = trim(formData.get('status')) || 'active';
  if (!isClientStatus(status)) {
    return { ok: false, error: 'Status tidak valid.' };
  }

  try {
    await prisma.client.create({
      data: {
        companyName,
        industry: trim(formData.get('industry')) || null,
        contactPerson: trim(formData.get('contactPerson')) || null,
        contactEmail: trim(formData.get('contactEmail')) || null,
        contactPhone: trim(formData.get('contactPhone')) || null,
        address: trim(formData.get('address')) || null,
        website: trim(formData.get('website')) || null,
        logo: trim(formData.get('logo')) || null,
        notes: trim(formData.get('notes')) || null,
        status,
      },
    });
    revalidatePath('/clients');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menambah klien.' };
  }
}

export async function updateClientAction(
  formData: FormData,
): Promise<ClientActionResult> {
  if (!(await requireManagementSession())) {
    return { ok: false, error: 'Hanya administrator atau PM.' };
  }

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Klien tidak valid.' };

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: 'Klien tidak ditemukan.' };

  const companyName = trim(formData.get('companyName'));
  if (!companyName || companyName.length < 2) {
    return { ok: false, error: 'Nama perusahaan minimal 2 karakter.' };
  }

  const status = trim(formData.get('status')) || 'active';
  if (!isClientStatus(status)) {
    return { ok: false, error: 'Status tidak valid.' };
  }

  try {
    await prisma.client.update({
      where: { id },
      data: {
        companyName,
        industry: trim(formData.get('industry')) || null,
        contactPerson: trim(formData.get('contactPerson')) || null,
        contactEmail: trim(formData.get('contactEmail')) || null,
        contactPhone: trim(formData.get('contactPhone')) || null,
        address: trim(formData.get('address')) || null,
        website: trim(formData.get('website')) || null,
        logo: trim(formData.get('logo')) || null,
        notes: trim(formData.get('notes')) || null,
        status,
      },
    });
    revalidatePath('/clients');
    revalidatePath(`/clients/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui klien.' };
  }
}
