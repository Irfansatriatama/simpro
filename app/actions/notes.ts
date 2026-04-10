'use server';

import { revalidatePath } from 'next/cache';
import {
  isNoteColorHex,
  isNoteSharePerm,
} from '@/lib/note-constants';
import {
  createNoteFolderRow,
  deleteNoteFolderRow,
  noteFolderExistsForUser,
} from '@/lib/note-folder-db';
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
    await audit(
      id,
      s.userId,
      acc.kind === 'owner' ? 'updated' : 'updated_shared',
    );
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

  const folderIdRaw = trim(formData.get('folderId'));
  let folderId: string | null = null;
  if (folderIdRaw && folderIdRaw !== 'none') {
    const ok = await noteFolderExistsForUser(folderIdRaw, s.userId);
    if (!ok) return { ok: false, error: 'Folder tidak valid.' };
    folderId = folderIdRaw;
  }

  try {
    await prisma.note.update({
      where: { id },
      data: { tags, color, folderId },
    });
    await audit(id, s.userId, 'meta');
    revalidatePath('/notes');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menyimpan tag atau warna.' };
  }
}

export async function createNoteFolderAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const name = trim(formData.get('name'));
  if (!name || name.length > 80) {
    return { ok: false, error: 'Nama folder 1–80 karakter.' };
  }

  const newId = await createNoteFolderRow(s.userId, name);
  if (!newId) return { ok: false, error: 'Gagal membuat folder.' };
  revalidatePath('/notes');
  return { ok: true, id: newId };
}

export async function renameNoteFolderAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const id = trim(formData.get('id'));
  const name = trim(formData.get('name'));
  if (!id) return { ok: false, error: 'Folder tidak valid.' };
  if (!name || name.length > 80) {
    return { ok: false, error: 'Nama folder 1–80 karakter.' };
  }

  try {
    const r = await prisma.noteFolder.updateMany({
      where: { id, userId: s.userId },
      data: { name },
    });
    if (r.count === 0) {
      return { ok: false, error: 'Folder tidak ditemukan.' };
    }
    revalidatePath('/notes');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mengganti nama folder.' };
  }
}

export async function deleteNoteFolderAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const id = trim(formData.get('id'));
  if (!id) return { ok: false, error: 'Folder tidak valid.' };

  const exists = await noteFolderExistsForUser(id, s.userId);
  if (!exists) return { ok: false, error: 'Folder tidak ditemukan.' };

  const ok = await deleteNoteFolderRow(id, s.userId);
  if (!ok) return { ok: false, error: 'Gagal menghapus folder.' };
  revalidatePath('/notes');
  return { ok: true };
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
    await audit(id, s.userId, 'deleted');
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
    await prisma.$transaction([
      prisma.note.update({
        where: { id: noteId },
        data: { sharePermission: permRaw },
      }),
      prisma.noteShare.upsert({
        where: { noteId_userId: { noteId, userId: targetUserId } },
        create: { noteId, userId: targetUserId, permission: permRaw },
        update: { permission: permRaw },
      }),
    ]);
    await audit(noteId, s.userId, 'shared');
    revalidatePath('/notes');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal membagikan catatan.' };
  }
}

export async function shareNoteBatchAction(
  formData: FormData,
): Promise<NoteActionOk<{ added: number }>> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const noteId = trim(formData.get('noteId'));
  const permRaw = trim(formData.get('permission')) || 'view';
  const idsRaw = trim(formData.get('userIds'));

  if (!noteId || !idsRaw) {
    return { ok: false, error: 'Data berbagi tidak lengkap.' };
  }
  if (!isNoteSharePerm(permRaw)) {
    return { ok: false, error: 'Izin tidak valid.' };
  }

  let userIds: string[];
  try {
    const parsed = JSON.parse(idsRaw) as unknown;
    if (!Array.isArray(parsed)) return { ok: false, error: 'Daftar pengguna tidak valid.' };
    userIds = parsed.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean);
  } catch {
    return { ok: false, error: 'Daftar pengguna tidak valid.' };
  }
  if (userIds.length === 0) {
    return { ok: false, error: 'Pilih minimal satu anggota.' };
  }
  if (userIds.length > 50) {
    return { ok: false, error: 'Maksimal 50 anggota per aksi.' };
  }

  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== s.userId) {
    return { ok: false, error: 'Hanya pemilik yang bisa berbagi.' };
  }

  const unique = Array.from(new Set(userIds)).filter((id) => id !== s.userId);
  if (unique.length === 0) {
    return { ok: false, error: 'Tidak ada pengguna tujuan yang valid.' };
  }

  const targets = await prisma.user.findMany({
    where: { id: { in: unique }, status: UserStatus.active },
    select: { id: true },
  });
  const allowed = new Set(targets.map((t) => t.id));
  const toAdd = unique.filter((id) => allowed.has(id));
  if (toAdd.length === 0) {
    return { ok: false, error: 'Tidak ada pengguna aktif yang dipilih.' };
  }

  try {
    await prisma.$transaction([
      prisma.note.update({
        where: { id: noteId },
        data: { sharePermission: permRaw },
      }),
      ...toAdd.map((userId) =>
        prisma.noteShare.upsert({
          where: { noteId_userId: { noteId, userId } },
          create: { noteId, userId, permission: permRaw },
          update: { permission: permRaw },
        }),
      ),
    ]);
    await audit(noteId, s.userId, 'shared');
    revalidatePath('/notes');
    return { ok: true, data: { added: toAdd.length } };
  } catch {
    return { ok: false, error: 'Gagal membagikan catatan.' };
  }
}

export async function setAllNoteSharesPermissionAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const noteId = trim(formData.get('noteId'));
  const permRaw = trim(formData.get('permission')) || 'view';
  if (!noteId) return { ok: false, error: 'Catatan tidak valid.' };
  if (!isNoteSharePerm(permRaw)) {
    return { ok: false, error: 'Izin tidak valid.' };
  }

  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== s.userId) {
    return { ok: false, error: 'Hanya pemilik yang bisa mengubah izin.' };
  }

  try {
    const [, r] = await prisma.$transaction([
      prisma.note.update({
        where: { id: noteId },
        data: { sharePermission: permRaw },
      }),
      prisma.noteShare.updateMany({
        where: { noteId },
        data: { permission: permRaw },
      }),
    ]);
    if (r.count > 0) {
      await audit(noteId, s.userId, 'permission_changed');
    }
    revalidatePath('/notes');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mengubah izin berbagi.' };
  }
}

export async function recordNoteViewedSharedAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const noteId = trim(formData.get('noteId'));
  if (!noteId) return { ok: false, error: 'Catatan tidak valid.' };

  const acc = await noteAccess(noteId, s.userId);
  if (!acc || acc.kind === 'owner') return { ok: true };

  await audit(noteId, s.userId, 'viewed_shared');
  return { ok: true };
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

/** Varian FormData untuk pemanggilan dari klien (lebih andal dengan server actions). */
export async function listNoteAuditsFormAction(
  formData: FormData,
): Promise<NoteActionOk<{ entries: NoteAuditEntry[] }>> {
  const noteId = trim(formData.get('noteId'));
  if (!noteId) return { ok: false, error: 'Catatan tidak valid.' };
  return listNoteAuditsAction(noteId);
}

const MAX_IMPORT_JSON_CHARS = 4_000_000;
const MAX_IMPORT_NOTES = 500;
const MAX_NOTE_CONTENT_IMPORT = 500_000;

function normalizeImportColor(c: unknown): string | null {
  if (typeof c !== 'string') return null;
  const x = c.trim();
  if (!x || x === '#ffffff') return null;
  if (/^#[0-9a-fA-F]{3,8}$/.test(x)) return x.slice(0, 32);
  if (isNoteColorHex(x)) return x;
  return null;
}

function looseNoteRecord(raw: unknown): {
  id: string;
  title: string | null;
  content: string;
  folderId: string | null;
  pinned: boolean;
  color: string | null;
  tags: string[];
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  if (!id) return null;
  const titleV = o.title;
  const title =
    titleV == null || String(titleV).trim() === ''
      ? null
      : String(titleV).trim().slice(0, 500);
  const content = String(o.content ?? '').slice(0, MAX_NOTE_CONTENT_IMPORT);
  const fr = o.folder_id ?? o.folderId;
  const folderId =
    fr != null && String(fr).trim() !== '' ? String(fr).trim() : null;
  return {
    id,
    title,
    content,
    folderId,
    pinned: Boolean(o.pinned),
    color: normalizeImportColor(o.color),
    tags: Array.isArray(o.tags)
      ? o.tags
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 30)
      : [],
  };
}

function looseFolderRecord(raw: unknown): {
  id: string;
  name: string;
  sortOrder: number;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  const name = String(o.name ?? 'Folder').trim().slice(0, 80) || 'Folder';
  const sortOrder = Number(o.sortOrder);
  if (!id) return null;
  return { id, name, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 };
}

export type NoteImportResult = {
  imported: number;
  skipped: number;
  foldersTouched: number;
};

export async function importNotesJsonAction(
  formData: FormData,
): Promise<NoteActionOk<NoteImportResult>> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const jsonRaw = String(formData.get('json') ?? '');
  if (!jsonRaw || jsonRaw.length > MAX_IMPORT_JSON_CHARS) {
    return { ok: false, error: 'Berkas JSON terlalu besar atau kosong.' };
  }

  let data: unknown;
  try {
    data = JSON.parse(jsonRaw) as unknown;
  } catch {
    return { ok: false, error: 'JSON tidak valid.' };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Format tidak dikenali.' };
  }
  const root = data as Record<string, unknown>;
  const foldersArr = Array.isArray(root.folders) ? root.folders : [];
  const notesArr = Array.isArray(root.notes) ? root.notes : [];
  if (notesArr.length === 0) {
    return { ok: false, error: 'Tidak ada catatan di dalam berkas.' };
  }
  if (notesArr.length > MAX_IMPORT_NOTES) {
    return {
      ok: false,
      error: `Maksimal ${MAX_IMPORT_NOTES} catatan per impor.`,
    };
  }

  const folderIdMap = new Map<string, string>();
  let foldersTouched = 0;
  let imported = 0;
  let skipped = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const fr of foldersArr) {
        const f = looseFolderRecord(fr);
        if (!f) continue;

        const existing = await tx.noteFolder.findUnique({
          where: { id: f.id },
        });
        if (existing) {
          if (existing.userId === s.userId) {
            folderIdMap.set(f.id, f.id);
          } else {
            const created = await tx.noteFolder.create({
              data: {
                userId: s.userId,
                name: f.name,
                sortOrder: f.sortOrder,
              },
            });
            folderIdMap.set(f.id, created.id);
            foldersTouched++;
          }
        } else {
          try {
            await tx.noteFolder.create({
              data: {
                id: f.id,
                userId: s.userId,
                name: f.name,
                sortOrder: f.sortOrder,
              },
            });
            folderIdMap.set(f.id, f.id);
            foldersTouched++;
          } catch {
            const created = await tx.noteFolder.create({
              data: {
                userId: s.userId,
                name: f.name,
                sortOrder: f.sortOrder,
              },
            });
            folderIdMap.set(f.id, created.id);
            foldersTouched++;
          }
        }
      }

      for (const raw of notesArr) {
        const n = looseNoteRecord(raw);
        if (!n) {
          skipped++;
          continue;
        }

        const exists = await tx.note.findUnique({ where: { id: n.id } });
        if (exists) {
          skipped++;
          continue;
        }

        let fid: string | null = null;
        if (n.folderId) {
          const mapped = folderIdMap.get(n.folderId) ?? n.folderId;
          const fold = await tx.noteFolder.findFirst({
            where: { id: mapped, userId: s.userId },
          });
          if (fold) fid = fold.id;
        }

        try {
          await tx.note.create({
            data: {
              id: n.id,
              userId: s.userId,
              title: n.title,
              content: n.content,
              folderId: fid,
              pinned: n.pinned,
              color: n.color,
              tags: n.tags,
            },
          });
          imported++;
        } catch {
          skipped++;
        }
      }
    });

    revalidatePath('/notes');
    return {
      ok: true,
      data: { imported, skipped, foldersTouched },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique') || msg.includes('unique')) {
      return { ok: false, error: 'Konflik ID saat impor.' };
    }
    return { ok: false, error: 'Gagal mengimpor catatan.' };
  }
}

const MAX_MARKDOWN_UPLOAD_BYTES = 600_000;

export async function importMarkdownNoteAction(
  formData: FormData,
): Promise<NoteActionOk<{ id: string }>> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Berkas tidak valid.' };
  }
  if (file.size > MAX_MARKDOWN_UPLOAD_BYTES) {
    return { ok: false, error: 'Berkas terlalu besar.' };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: 'Gagal membaca berkas.' };
  }
  if (text.length > MAX_NOTE_CONTENT_IMPORT) {
    return { ok: false, error: 'Isi berkas melebihi batas.' };
  }

  const baseName = file.name.replace(/\.(md|txt)$/i, '').trim().slice(0, 500);
  const title = baseName.length > 0 ? baseName : null;

  const folderIdRaw = trim(formData.get('folderId'));
  let folderId: string | null = null;
  if (folderIdRaw && folderIdRaw !== 'none') {
    const ok = await noteFolderExistsForUser(folderIdRaw, s.userId);
    if (!ok) return { ok: false, error: 'Folder tidak valid.' };
    folderId = folderIdRaw;
  }

  try {
    const note = await prisma.note.create({
      data: {
        userId: s.userId,
        title,
        content: text,
        tags: [],
        folderId,
      },
    });
    await audit(note.id, s.userId, 'created_md');
    revalidatePath('/notes');
    return { ok: true, id: note.id };
  } catch {
    return { ok: false, error: 'Gagal membuat catatan dari berkas.' };
  }
}

export async function recordNoteExportAuditAction(
  formData: FormData,
): Promise<NoteActionOk> {
  const s = await requireSessionUser();
  if (!s) return { ok: false, error: 'Silakan masuk lagi.' };

  const noteId = trim(formData.get('noteId'));
  if (!noteId) return { ok: false, error: 'Catatan tidak valid.' };

  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== s.userId) {
    return { ok: false, error: 'Hanya pemilik yang dapat mengekspor.' };
  }

  await audit(noteId, s.userId, 'exported');
  return { ok: true };
}

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
