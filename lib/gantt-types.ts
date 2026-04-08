import type { Priority, TaskStatus, TaskType } from '@prisma/client';

export type GanttZoom = 'day' | 'week' | 'month';

/** Filter sprint: semua | tanpa sprint | id sprint */
export type GanttSprintFilter = 'all' | 'none' | string;

export type GanttSprintRow = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
};

export type GanttTaskRow = {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  sprintId: string | null;
  startDate: string | null;
  dueDate: string | null;
  assigneeInitials: string;
};

export type GanttRow =
  | { kind: 'sprint'; sprint: GanttSprintRow | null }
  | { kind: 'task'; task: GanttTaskRow };
