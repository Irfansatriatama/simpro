import { TaskType } from '@prisma/client';
import type {
  GanttRow,
  GanttSprintFilter,
  GanttSprintRow,
  GanttTaskRow,
  GanttZoom,
} from '@/lib/gantt-types';

const DAY_MS = 86_400_000;

export function ganttPixelsPerDay(zoom: GanttZoom): number {
  if (zoom === 'day') return 40;
  if (zoom === 'week') return 18;
  return 8;
}

export function ganttRangePadDays(zoom: GanttZoom): number {
  if (zoom === 'day') return 3;
  if (zoom === 'week') return 7;
  return 30;
}

function atDayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function parseIsoDate(s: string | null): number | null {
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Tugas dengan minimal salah satu tanggal; epic dikecualikan (sama pola board). */
export function ganttEligibleTasks(tasks: GanttTaskRow[]): GanttTaskRow[] {
  return tasks.filter(
    (t) =>
      t.type !== TaskType.epic && (t.startDate != null || t.dueDate != null),
  );
}

export function ganttVisibleTasks(
  tasks: GanttTaskRow[],
  filter: GanttSprintFilter,
): GanttTaskRow[] {
  const base = ganttEligibleTasks(tasks);
  if (filter === 'none') return base.filter((t) => !t.sprintId);
  if (filter !== 'all') return base.filter((t) => t.sprintId === filter);
  return base;
}

export function ganttSprintsForFilter(
  sprints: GanttSprintRow[],
  filter: GanttSprintFilter,
): GanttSprintRow[] {
  if (filter === 'none') return [];
  if (filter === 'all') return [...sprints].sort(compareSprintStart);
  return sprints.filter((s) => s.id === filter);
}

function compareSprintStart(a: GanttSprintRow, b: GanttSprintRow): number {
  const ta = parseIsoDate(a.startDate) ?? 0;
  const tb = parseIsoDate(b.startDate) ?? 0;
  return ta - tb;
}

export function ganttDateRange(
  tasks: GanttTaskRow[],
  sprints: GanttSprintRow[],
  filter: GanttSprintFilter,
  zoom: GanttZoom,
): { min: Date; max: Date } {
  const sprintsToConsider = ganttSprintsForFilter(sprints, filter);
  let minT: number | null = null;
  let maxT: number | null = null;

  const consider = (ms: number | null) => {
    if (ms == null || Number.isNaN(ms)) return;
    if (minT === null || ms < minT) minT = ms;
    if (maxT === null || ms > maxT) maxT = ms;
  };

  for (const t of tasks) {
    consider(parseIsoDate(t.startDate));
    consider(parseIsoDate(t.dueDate));
  }
  for (const s of sprintsToConsider) {
    consider(parseIsoDate(s.startDate));
    consider(parseIsoDate(s.endDate));
  }
  consider(Date.now());

  const pad = ganttRangePadDays(zoom) * DAY_MS;
  if (minT === null || maxT === null) {
    const now = Date.now();
    return {
      min: new Date(now - 14 * DAY_MS - pad),
      max: new Date(now + 30 * DAY_MS + pad),
    };
  }
  return {
    min: new Date(minT - pad),
    max: new Date(maxT + pad),
  };
}

export function ganttBuildRows(
  tasks: GanttTaskRow[],
  sprints: GanttSprintRow[],
  filter: GanttSprintFilter,
): GanttRow[] {
  const rows: GanttRow[] = [];
  const sprintList = ganttSprintsForFilter(sprints, filter);
  const sprintMap = new Map<string, GanttTaskRow[]>();
  for (const s of sprintList) {
    sprintMap.set(s.id, []);
  }
  const noSprint: GanttTaskRow[] = [];

  for (const t of tasks) {
    if (t.sprintId && sprintMap.has(t.sprintId)) {
      sprintMap.get(t.sprintId)!.push(t);
    } else {
      noSprint.push(t);
    }
  }

  for (const s of sprintList) {
    rows.push({ kind: 'sprint', sprint: s });
    for (const t of sprintMap.get(s.id) ?? []) {
      rows.push({ kind: 'task', task: t });
    }
  }

  if (noSprint.length > 0) {
    if (sprintList.length > 0) {
      rows.push({ kind: 'sprint', sprint: null });
    }
    for (const t of noSprint) {
      rows.push({ kind: 'task', task: t });
    }
  }

  return rows;
}

/** Rentang batang di timeline (ms, inklusif hari). */
export function ganttTaskBarRange(task: GanttTaskRow): {
  startMs: number;
  endMs: number;
} | null {
  const startRaw = parseIsoDate(task.startDate);
  const dueRaw = parseIsoDate(task.dueDate);
  const startMs =
    startRaw != null
      ? atDayStart(new Date(startRaw))
      : dueRaw != null
        ? atDayStart(new Date(dueRaw))
        : null;
  const endMs =
    dueRaw != null
      ? atDayStart(new Date(dueRaw))
      : startRaw != null
        ? atDayStart(new Date(startRaw))
        : null;
  if (startMs == null || endMs == null) return null;
  return startMs <= endMs ? { startMs, endMs } : { startMs: endMs, endMs: startMs };
}

export function ganttSprintBarRange(
  sprint: GanttSprintRow,
): { startMs: number; endMs: number } | null {
  const a = parseIsoDate(sprint.startDate);
  const b = parseIsoDate(sprint.endDate);
  if (a == null && b == null) return null;
  const startMs = atDayStart(new Date(a ?? b!));
  const endMs = atDayStart(new Date(b ?? a!));
  return startMs <= endMs ? { startMs, endMs } : { startMs: endMs, endMs: startMs };
}

export function ganttIsOverdue(task: GanttTaskRow, now: Date = new Date()): boolean {
  if (task.status === 'done' || task.status === 'cancelled') return false;
  const due = parseIsoDate(task.dueDate);
  if (due == null) return false;
  return atDayStart(new Date(due)) < atDayStart(now);
}
