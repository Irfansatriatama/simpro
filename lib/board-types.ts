import type { Priority, TaskStatus, TaskType } from '@prisma/client';

export type BoardTaskCard = {
  id: string;
  title: string;
  status: TaskStatus;
  columnId: string | null;
  priority: Priority;
  type: TaskType;
  storyPoints: number | null;
  assigneeNames: string[];
};
