import { Priority, TaskStatus, TaskType } from '@prisma/client';

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  [TaskStatus.backlog]: 'Backlog',
  [TaskStatus.todo]: 'To do',
  [TaskStatus.in_progress]: 'Sedang dikerjakan',
  [TaskStatus.in_review]: 'Review',
  [TaskStatus.done]: 'Selesai',
  [TaskStatus.cancelled]: 'Dibatalkan',
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  [TaskType.story]: 'Story',
  [TaskType.task]: 'Task',
  [TaskType.bug]: 'Bug',
  [TaskType.enhancement]: 'Enhancement',
  [TaskType.epic]: 'Epic',
};

export { PRIORITY_LABEL } from '@/lib/project-labels';
