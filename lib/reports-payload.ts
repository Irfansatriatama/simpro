import type { TaskStatus, TaskType } from '@prisma/client';
import {
  MaintenanceStatus,
  MaintenanceType,
  TaskStatus as TS,
  TaskType as TT,
} from '@prisma/client';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
} from '@/lib/maintenance-labels';
import type {
  ReportsAssets,
  ReportsMaintenance,
  ReportsPayload,
  ReportsProgress,
  ReportsSprintSummary,
  ReportsTimeRow,
  ReportsWorkloadRow,
} from '@/lib/reports-types';
import { TASK_STATUS_LABEL, TASK_TYPE_LABEL } from '@/lib/task-labels';

type TaskLite = {
  status: TaskStatus;
  type: TaskType;
  storyPoints: number | null;
  timeLogged: number;
  sprintId: string | null;
  updatedAt: Date;
  completedAt: Date | null;
  assignees: { userId: string; user: { name: string } }[];
};

type SprintLite = {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
};

type MaintLite = {
  title: string;
  status: MaintenanceStatus;
  type: MaintenanceType;
  updatedAt: Date;
};

type AssetLite = { category: string; status: string };

type MemberLite = { userId: string; name: string };

function taskMatchesDateFilter(
  t: TaskLite,
  from: Date | null,
  to: Date | null,
): boolean {
  if (!from && !to) return true;
  const anchor = t.completedAt ?? t.updatedAt;
  const x = anchor.getTime();
  if (from && x < from.getTime()) return false;
  if (to && x > to.getTime()) return false;
  return true;
}

function maintMatchesDateFilter(
  m: MaintLite,
  from: Date | null,
  to: Date | null,
): boolean {
  if (!from && !to) return true;
  const x = m.updatedAt.getTime();
  if (from && x < from.getTime()) return false;
  if (to && x > to.getTime()) return false;
  return true;
}

const OPEN_TASK: TaskStatus[] = [
  TS.backlog,
  TS.todo,
  TS.in_progress,
  TS.in_review,
];

function isOpenTaskStatus(s: TaskStatus): boolean {
  return OPEN_TASK.includes(s);
}

export function buildReportsPayload(
  tasksRaw: TaskLite[],
  sprintsRaw: SprintLite[],
  maintenanceRaw: MaintLite[],
  assetsRaw: AssetLite[],
  members: MemberLite[],
  dateFrom: Date | null,
  dateTo: Date | null,
): ReportsPayload {
  const filterActive = !!(dateFrom || dateTo);
  const tasks = tasksRaw.filter((t) =>
    taskMatchesDateFilter(t, dateFrom, dateTo),
  );
  const maintenance = maintenanceRaw.filter((m) =>
    maintMatchesDateFilter(m, dateFrom, dateTo),
  );

  const byStatusMap = new Map<TaskStatus, number>();
  const byTypeMap = new Map<TaskType, number>();
  for (const s of Object.values(TS)) byStatusMap.set(s, 0);
  for (const ty of Object.values(TT)) byTypeMap.set(ty, 0);

  for (const t of tasks) {
    byStatusMap.set(t.status, (byStatusMap.get(t.status) ?? 0) + 1);
    byTypeMap.set(t.type, (byTypeMap.get(t.type) ?? 0) + 1);
  }

  const byStatus: ReportsProgress['byStatus'] = Object.values(TS).map(
    (key) => ({
      key,
      label: TASK_STATUS_LABEL[key],
      count: byStatusMap.get(key) ?? 0,
    }),
  );
  const byType: ReportsProgress['byType'] = Object.values(TT).map((key) => ({
    key,
    label: TASK_TYPE_LABEL[key],
    count: byTypeMap.get(key) ?? 0,
  }));

  const workloadMap = new Map<
    string,
    { name: string; assigned: number; open: number; storyPoints: number }
  >();
  for (const m of members) {
    workloadMap.set(m.userId, {
      name: m.name,
      assigned: 0,
      open: 0,
      storyPoints: 0,
    });
  }

  for (const t of tasks) {
    const sp = t.storyPoints ?? 0;
    const assigneeIds = t.assignees.map((a) => a.userId);
    if (assigneeIds.length === 0) continue;
    const open = isOpenTaskStatus(t.status);
    const spShare = sp / assigneeIds.length;
    for (const uid of assigneeIds) {
      if (!workloadMap.has(uid)) {
        const name =
          t.assignees.find((a) => a.userId === uid)?.user.name ?? uid;
        workloadMap.set(uid, {
          name,
          assigned: 0,
          open: 0,
          storyPoints: 0,
        });
      }
      const row = workloadMap.get(uid)!;
      row.assigned += 1;
      if (open) row.open += 1;
      row.storyPoints += spShare;
    }
  }

  const workload: ReportsWorkloadRow[] = Array.from(
    workloadMap.entries(),
  ).map(([userId, w]) => ({
    userId,
    name: w.name,
    assigned: w.assigned,
    open: w.open,
    storyPoints: Math.round(w.storyPoints * 10) / 10,
  }));
  workload.sort((a, b) => b.assigned - a.assigned);

  const sprints: ReportsSprintSummary[] = sprintsRaw.map((s) => {
    const inSprint = tasks.filter((t) => t.sprintId === s.id);
    const doneTasks = inSprint.filter((t) => t.status === TS.done).length;
    let totalSP = 0;
    let doneSP = 0;
    for (const t of inSprint) {
      const sp = t.storyPoints ?? 0;
      totalSP += sp;
      if (t.status === TS.done) doneSP += sp;
    }
    return {
      id: s.id,
      name: s.name,
      startDate: s.startDate ? s.startDate.toISOString() : null,
      endDate: s.endDate ? s.endDate.toISOString() : null,
      status: s.status,
      totalTasks: inSprint.length,
      doneTasks,
      totalStoryPoints: totalSP,
      doneStoryPoints: doneSP,
    };
  });

  const maintByStatus = new Map<MaintenanceStatus, number>();
  for (const s of Object.values(MaintenanceStatus)) {
    maintByStatus.set(s, 0);
  }
  for (const m of maintenance) {
    maintByStatus.set(m.status, (maintByStatus.get(m.status) ?? 0) + 1);
  }
  const maintenanceOut: ReportsMaintenance = {
    byStatus: Object.values(MaintenanceStatus).map((key) => ({
      key,
      label: MAINTENANCE_STATUS_LABEL[key],
      count: maintByStatus.get(key) ?? 0,
    })),
    recent: [...maintenance]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 8)
      .map((m) => ({
        title: m.title,
        status: m.status,
        statusLabel: MAINTENANCE_STATUS_LABEL[m.status],
        typeLabel: MAINTENANCE_TYPE_LABEL[m.type],
      })),
  };

  const catMap = new Map<string, number>();
  for (const a of assetsRaw) {
    catMap.set(a.category, (catMap.get(a.category) ?? 0) + 1);
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  const assets: ReportsAssets = {
    byCategory,
    total: assetsRaw.length,
  };

  const timeByUser = new Map<string, { name: string; minutes: number }>();
  for (const m of members) {
    timeByUser.set(m.userId, { name: m.name, minutes: 0 });
  }
  let totalMinutes = 0;
  for (const t of tasks) {
    const raw = t.timeLogged;
    if (!raw || raw <= 0) continue;
    totalMinutes += raw;
    const ids = t.assignees.map((a) => a.userId);
    if (ids.length === 0) continue;
    const share = raw / ids.length;
    for (const uid of ids) {
      if (!timeByUser.has(uid)) {
        const name =
          t.assignees.find((a) => a.userId === uid)?.user.name ?? uid;
        timeByUser.set(uid, { name, minutes: 0 });
      }
      const row = timeByUser.get(uid)!;
      row.minutes += share;
    }
  }

  const byUser: ReportsTimeRow[] = Array.from(timeByUser.entries())
    .map(([userId, v]) => ({
      userId,
      name: v.name,
      minutes: Math.round(v.minutes),
    }))
    .filter((r) => r.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  return {
    progress: {
      byStatus,
      byType,
      total: tasks.length,
    },
    workload,
    sprints,
    maintenance: maintenanceOut,
    assets,
    timeTracking: { totalMinutes, byUser },
    filterActive,
  };
}
