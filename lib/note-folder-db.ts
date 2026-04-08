import { randomUUID } from 'crypto';

import { prisma } from '@/lib/prisma';

/** Akses tabel `note_folders` lewat SQL agar tetap jalan bila `prisma generate` belum dijalankan (delegate `noteFolder` belum ada). */

export type NoteFolderDbRow = {
  id: string;
  name: string;
  sortOrder: number;
};

export async function listNoteFoldersForUser(
  userId: string,
): Promise<NoteFolderDbRow[]> {
  try {
    return await prisma.$queryRaw<NoteFolderDbRow[]>`
      SELECT id, name, "sortOrder"
      FROM note_folders
      WHERE "userId" = ${userId}
      ORDER BY "sortOrder" ASC, name ASC
    `;
  } catch {
    return [];
  }
}

export async function noteFolderExistsForUser(
  folderId: string,
  userId: string,
): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM note_folders
      WHERE id = ${folderId} AND "userId" = ${userId}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function createNoteFolderRow(
  userId: string,
  name: string,
): Promise<string | null> {
  try {
    const agg = await prisma.$queryRaw<{ next: number }[]>`
      SELECT (COALESCE(MAX("sortOrder"), -1) + 1)::int AS next
      FROM note_folders WHERE "userId" = ${userId}
    `;
    const sortOrder = Number(agg[0]?.next ?? 0);
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO note_folders (id, "userId", name, "sortOrder", "createdAt")
      VALUES (${id}, ${userId}, ${name}, ${sortOrder}, NOW())
    `;
    return id;
  } catch {
    return null;
  }
}

export async function deleteNoteFolderRow(
  folderId: string,
  userId: string,
): Promise<boolean> {
  try {
    await prisma.$executeRaw`
      DELETE FROM note_folders
      WHERE id = ${folderId} AND "userId" = ${userId}
    `;
    return true;
  } catch {
    return false;
  }
}
