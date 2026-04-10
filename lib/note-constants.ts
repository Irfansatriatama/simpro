/** Warna kartu catatan (hex), selaras referensi Trackly. */
export const NOTE_COLORS = [
  '#ffffff',
  '#fef9c3',
  '#dcfce7',
  '#dbeafe',
  '#fce7f3',
  '#ede9fe',
  '#ffedd5',
] as const;

export type NoteColorHex = (typeof NOTE_COLORS)[number];

export const NOTE_SHARE_PERMS = ['view', 'edit'] as const;
export type NoteSharePerm = (typeof NOTE_SHARE_PERMS)[number];

export function isNoteColorHex(s: string | null | undefined): s is NoteColorHex {
  if (!s) return false;
  return (NOTE_COLORS as readonly string[]).includes(s);
}

export function isNoteSharePerm(s: string): s is NoteSharePerm {
  return (NOTE_SHARE_PERMS as readonly string[]).includes(s);
}

/** Label audit untuk tampilan (aksi disimpan sebagai kunci pendek). */
export const NOTE_AUDIT_LABEL: Record<string, string> = {
  created: 'Membuat catatan',
  created_md: 'Membuat catatan dari unggahan Markdown',
  updated: 'Mengubah isi',
  updated_shared: 'Mengubah isi (akses berbagi)',
  deleted: 'Menghapus catatan',
  pinned: 'Menyematkan',
  unpinned: 'Melepas sematan',
  meta: 'Mengubah tag / warna / folder',
  shared: 'Membagikan ke anggota',
  unshared: 'Mencabut akses berbagi',
  permission_changed: 'Mengubah izin berbagi untuk semua penerima',
  viewed_shared: 'Melihat catatan (dibagikan)',
  exported: 'Mengekspor catatan (Markdown)',
  imported: 'Impor catatan (paket JSON)',
};
