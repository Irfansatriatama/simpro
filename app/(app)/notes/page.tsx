import { NotesClient } from '@/components/notes/notes-client';
import { listNoteFoldersForUser } from '@/lib/note-folder-db';
import type { NoteClientRow, NoteFolderRow } from '@/lib/note-types';
import { requireSessionUser } from '@/lib/require-session';
import { prisma } from '@/lib/prisma';
import { Prisma, UserStatus } from '@prisma/client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NotesPage() {
  const s = await requireSessionUser();
  if (!s) redirect('/login');

  const [owned, incoming, shareTargets, foldersRaw] = await Promise.all([
    prisma.note.findMany({
      where: { userId: s.userId },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        sharedWith: {
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
    }),
    prisma.noteShare.findMany({
      where: { userId: s.userId },
      include: {
        note: {
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { id: { not: s.userId }, status: UserStatus.active },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true },
    }),
    listNoteFoldersForUser(s.userId),
  ]);

  const folderNameById: Record<string, string> = Object.fromEntries(
    foldersRaw.map((f) => [f.id, f.name]),
  );

  const extraFolderIds = new Set<string>();
  for (const inc of incoming) {
    const fid = inc.note.folderId;
    if (fid && folderNameById[fid] === undefined) {
      extraFolderIds.add(fid);
    }
  }
  if (extraFolderIds.size > 0) {
    const ids = Array.from(extraFolderIds);
    try {
      const extraRows = await prisma.$queryRaw<{ id: string; name: string }[]>`
        SELECT id, name FROM note_folders
        WHERE id IN (${Prisma.join(ids)})
      `;
      for (const r of extraRows) {
        folderNameById[r.id] = r.name;
      }
    } catch {
      /* tabel belum ada / generate belum jalan */
    }
  }

  const folders: NoteFolderRow[] = foldersRaw.map((f) => ({
    id: f.id,
    name: f.name,
    sortOrder: f.sortOrder,
  }));

  const ownedRows: NoteClientRow[] = owned.map((n) => ({
    id: n.id,
    userId: n.userId,
    title: n.title,
    content: n.content,
    pinned: n.pinned,
    color: n.color,
    tags: n.tags,
    folderId: n.folderId,
    folderName: n.folderId ? folderNameById[n.folderId] ?? null : null,
    updatedAt: n.updatedAt.toISOString(),
    createdAt: n.createdAt.toISOString(),
    access: 'owner',
    ownerName: s.name,
    ownerId: n.userId,
    sharedWith: n.sharedWith.map((sh) => ({
      userId: sh.userId,
      userName: sh.user.name ?? sh.user.username,
      username: sh.user.username,
      permission: sh.permission,
    })),
  }));

  const sharedRows: NoteClientRow[] = incoming.map((inc) => {
    const n = inc.note;
    const access =
      inc.permission === 'edit' ? 'shared_edit' : 'shared_view';
    return {
      id: n.id,
      userId: n.userId,
      title: n.title,
      content: n.content,
      pinned: n.pinned,
      color: n.color,
      tags: n.tags,
      folderId: n.folderId,
      folderName: n.folderId ? folderNameById[n.folderId] ?? null : null,
      updatedAt: n.updatedAt.toISOString(),
      createdAt: n.createdAt.toISOString(),
      access,
      ownerName: n.owner.name ?? 'Pengguna',
      ownerId: n.owner.id,
      sharedWith: [],
    };
  });

  const merged = [...ownedRows, ...sharedRows];
  merged.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <NotesClient
      notes={merged}
      shareTargets={shareTargets}
      folders={folders}
    />
  );
}
