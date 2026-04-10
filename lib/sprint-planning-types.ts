import type { Priority, TaskStatus } from '@prisma/client';

/** Tugas non-epic untuk perencanaan sprint & board sprint. */
export type SprintTaskRef = {
  id: string;
  title: string;
  sprintId: string | null;
  status: TaskStatus;
  storyPoints: number | null;
  priority: Priority;
  columnId: string | null;
  assigneeNames: string[];
};
