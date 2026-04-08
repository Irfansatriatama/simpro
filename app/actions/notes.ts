'use server';

import { revalidatePath } from 'next/cache';
import {
  isNoteColorHex,
  isNoteSharePerm,
} from '@/lib/note-constants';
import { requireSessionUser } from '@/lib/require-session';
import { prisma } from '@/lib/prisma';
import { UserStatus } from '@prisma/client';

export type NoteActionOk<T = undefined> =
  | { ok: true; id?: string; data?: T }
  | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,;]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 30),
    ),
  );
}

async function noteAccess(
  noteId: string,
  userId: string,
): Promise<
  | { kind: 'owner' }
  | { kind: 'shared'; permission: 'view' | 'edit' }
  | null
> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return null;
  if (note.userId === userId) return { kind: 'owner' };
  const sh = await prisma.noteShare.findUnique({
    where: { noteId_userId: { noteId, userId } },
  });
  if (!sh) return null;
  return {
    kind: 'shared',
    permission: sh.permission === 'edit' ? 'edit' : 'view',
  };
}

async function audit(
  noteId: string,
  userId: string,
  action: string,
): Promise<void> {
  try {
    await prisma.noteAudit.create({
      data: { noteId, userId, action },
    });
  } catch {
    /* abaikan */
  }
}

export async function createNoteAction(): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  try {
    const note = await prisma.note.create({
      data: {
        userId: s.userId,
        title: null,
        content: '',
        tags: [],
      },
    });
    await audit(note.id, s.userId, 'created');
    revalidatePath('/notes');
    return { ok: true, id: note.id };
  } catch {
    return { ok: false, error: 'Gagal membuat catatan.' };
  }
}

export async function updateNoteContentAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Catatan tidak valid.' };

  const acc = await noteAccess(id, s.userId);
  if (!acc) return { ok: false, error: 'Tidak punya akses.' };
  if (acc.kind === 'shared' && acc.permission !== 'edit') {
    return { ok: false, error: 'Hanya lihat — tidak bisa mengubah.' };
  }

  const titleRaw = trim(formData.get('title'));
  const title = titleRaw.length === 0 ? null : titleRaw.slice(0, 500);
  const content = String(formData.get('content') ?? '');

  try {
    await prisma.note.update({
      where: { id },
      data: { title, content },
    });
    await audit(id, s.userId, 'updated');
    /* Tanpa revalidatePath: hindari race refresh yang menimpa ketikan di editor. */
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menyimpan catatan.' };
  }
}

export async function toggleNotePinAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Catatan tidak valid.' };

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.userId !== s.userId) {
    return { ok: false, error: 'Hanya pemilik yang bisa menyematkan.' };
  }

  const next = !note.pinned;
  try {
    await prisma.note.update({
      where: { id },
      data: { pinned: next },
    });
    await audit(id, s.userId, next ? 'pinned' : 'unpinned');
    revalidatePath('/notes');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mengubah sematan.' };
  }
}

export async function updateNoteMetaAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Catatan tidak valid.' };

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.userId !== s.userId) {
    return { ok: false, error: 'Hanya pemilik yang bisa mengubah tag/warna.' };
  }

  const tags = parseTags(trim(formData.get('tags')));
  const colorRaw = trim(formData.get('color'));
  const color =
    colorRaw === '' || colorRaw === 'none'
      ? null
      : isNoteColorHex(colorRaw)
        ? colorRaw
        : null;

  try {
    await prisma.note.update({
      where: { id },
      data: { tags, color },
    });
    await audit(id, s.userId, 'meta');
    revalidatePath('/notes');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menyimpan tag atau warna.' };
  }
}

export async function deleteNoteAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Catatan tidak valid.' };

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.userId !== s.userId) {
    return { ok: false, error: 'Hanya pemilik yang bisa menghapus.' };
  }

  try {
    await prisma.note.delete({ where: { id } });
    revalidatePath('/notes');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus catatan.' };
  }
}

export async function shareNoteAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const noteId = trim(formData.get('noteId'));
  const targetUserId = trim(formData.get('targetUserId'));
  const permRaw = trim(formData.get('permission')) || 'view';

  if (!noteId || !targetUserId) {
    return { ok: false, error: 'Data berbagi tidak lengkap.' };
  }
  if (targetUserId === s.userId) {
    return { ok: false, error: 'Tidak bisa membagikan ke diri sendiri.' };
  }
  if (!isNoteSharePerm(permRaw)) {
    return { ok: false, error: 'Izin tidak valid.' };
  }

  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== s.userId) {
    return { ok: false, error: 'Hanya pemilik yang bisa berbagi.' };
  }

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, status: UserStatus.active },
  });
  if (!target) return { ok: false, error: 'Pengguna tujuan tidak ditemukan.' };

  try {
    await prisma.noteShare.upsert({
      where: { noteId_userId: { noteId, userId: targetUserId } },
      create: { noteId, userId: targetUserId, permission: permRaw },
      update: { permission: permRaw },
    });
    await audit(noteId, s.userId, 'shared');
    revalidatePath('/notes');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal membagikan catatan.' };
  }
}

export async function unshareNoteAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const noteId = trim(formData.get('noteId'));
  const targetUserId = trim(formData.get('targetUserId'));
  if (!noteId || !targetUserId) {
    return { ok: false, error: 'Data tidak lengkap.' };
  }

  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== s.userId) {
    return { ok: false, error: 'Hanya pemilik yang bisa mencabut akses.' };
  }

  try {
    await prisma.noteShare.delete({
      where: { noteId_userId: { noteId, userId: targetUserId } },
    });
    await audit(noteId, s.userId, 'unshared');
    revalidatePath('/notes');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mencabut akses.' };
  }
}

export type NoteAuditEntry = {
  id: string;
  action: string;
  actorName: string;
  createdAt: string;
};

export async function listNoteAuditsAction(
  noteId: string,
): Promise<NoteActionOk<{ entries: NoteAuditEntry[] }>> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== s.userId) {
    return { ok: false, error: 'Hanya pemilik yang bisa melihat riwayat.' };
  }

  try {
    const rows = await prisma.noteAudit.findMany({
      where: { noteId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true } } },
    });
    const entries: NoteAuditEntry[] = rows.map((r) => ({
      id: r.id,
      action: r.action,
      actorName: r.user.name ?? 'Pengguna',
      createdAt: r.createdAt.toISOString(),
    }));
    return { ok: true, data: { entries } };
  } catch {
    return { ok: false, error: 'Gagal memuat riwayat.' };
  }
}
