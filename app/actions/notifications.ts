'use server';

import { revalidatePath } from 'next/cache';
import { requireSessionUser } from '@/lib/require-session';
import { prisma } from '@/lib/prisma';

export type NotificationActionResult = { ok: true } | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

export async function markNotificationReadAction(
  formData: FormData,
): Promise<NotificationActionResult> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Notifikasi tidak valid.' };

  const row = await prisma.notification.findFirst({
    where: { id, userId: s.userId },
  });
  if (!row) return { ok: false, error: 'Tidak ditemukan.' };

  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    revalidatePath('/notifications');
    revalidatePath('/dashboard', 'layout');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui.' };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  try {
    await prisma.notification.updateMany({
      where: { userId: s.userId, read: false },
      data: { read: true },
    });
    revalidatePath('/notifications');
    revalidatePath('/dashboard', 'layout');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui.' };
  }
}
