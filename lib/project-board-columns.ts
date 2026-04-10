import { TaskStatus } from '@prisma/client';

import { BOARD_COLUMNS } from '@/lib/board-columns';

export type ProjectBoardColumn = {
  id: string;
  title: string;
  status: TaskStatus;
};

const TASK_STATUSES = new Set<string>(Object.values(TaskStatus));

function isTaskStatus(s: string): s is TaskStatus {
  return TASK_STATUSES.has(s);
}

export function defaultProjectBoardColumns(): ProjectBoardColumn[] {
  return BOARD_COLUMNS.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
  }));
}

/** Normalisasi JSON DB → daftar kolom; gagal / kosong → default. */
export function getBoardColumnsForProject(
  json: unknown | null | undefined,
): ProjectBoardColumn[] {
  if (json == null) return defaultProjectBoardColumns();
  if (!Array.isArray(json) || json.length === 0) {
    return defaultProjectBoardColumns();
  }
  const out: ProjectBoardColumn[] = [];
  for (const raw of json) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    const st = typeof o.status === 'string' ? o.status : '';
    if (!id || !title || !isTaskStatus(st)) continue;
    out.push({ id, title, status: st });
  }
  return out.length > 0 ? out : defaultProjectBoardColumns();
}

export function findBoardColumn(
  columns: ProjectBoardColumn[],
  columnId: string,
): ProjectBoardColumn | undefined {
  return columns.find((c) => c.id === columnId);
}

/** Kolom tempat kartu harus tampil untuk kombinasi columnId + status. */
export function resolveColumnIdInLayout(
  columnId: string | null,
  status: TaskStatus,
  columns: ProjectBoardColumn[],
): string {
  if (columnId && columns.some((c) => c.id === columnId)) return columnId;
  const byStatus = columns.find((c) => c.status === status);
  if (byStatus) return byStatus.id;
  return columns[0]?.id ?? 'bc_backlog';
}

export function firstColumnIdForStatus(
  columns: ProjectBoardColumn[],
  status: TaskStatus,
): string {
  return resolveColumnIdInLayout(null, status, columns);
}
