import { TaskStatus } from '@prisma/client';

/** ID kolom board disimpan di `Task.columnId` dan diselaraskan dengan `Task.status`. */
export const BOARD_COLUMNS = [
  {
    id: 'bc_backlog',
    title: 'Backlog',
    status: TaskStatus.backlog,
  },
  {
    id: 'bc_todo',
    title: 'To do',
    status: TaskStatus.todo,
  },
  {
    id: 'bc_progress',
    title: 'Sedang dikerjakan',
    status: TaskStatus.in_progress,
  },
  {
    id: 'bc_review',
    title: 'Review',
    status: TaskStatus.in_review,
  },
  {
    id: 'bc_done',
    title: 'Selesai',
    status: TaskStatus.done,
  },
  {
    id: 'bc_cancelled',
    title: 'Dibatalkan',
    status: TaskStatus.cancelled,
  },
] as const;

export type BoardColumnId = (typeof BOARD_COLUMNS)[number]['id'];

export function isBoardColumnId(id: string): id is BoardColumnId {
  return BOARD_COLUMNS.some((c) => c.id === id);
}

export function boardColumnIdForStatus(status: TaskStatus): BoardColumnId {
  const c = BOARD_COLUMNS.find((x) => x.status === status);
  return c?.id ?? 'bc_backlog';
}

export function boardColumnById(id: string) {
  return BOARD_COLUMNS.find((c) => c.id === id);
}

/** Tampilkan tugas di kolom: pakai columnId jika valid, else turun dari status. */
export function resolveBoardColumnId(
  columnId: string | null,
  status: TaskStatus,
): BoardColumnId {
  if (columnId && isBoardColumnId(columnId)) return columnId;
  return boardColumnIdForStatus(status);
}
