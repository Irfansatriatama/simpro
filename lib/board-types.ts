import type { Priority, TaskStatus, TaskType } from '@prisma/client';

export type BoardAssigneePick = {
  id: string;
  name: string;
  image: string | null;
};

export type BoardTaskCard = {
  id: string;
  title: string;
  status: TaskStatus;
  columnId: string | null;
  priority: Priority;
  type: TaskType;
  storyPoints: number | null;
  tags: string[];
  dueDate: string | null;
  sprintId: string | null;
  sprintName: string | null;
  checklistDone: number;
  checklistTotal: number;
  commentCount: number;
  assignees: BoardAssigneePick[];
};

export type BoardMemberPick = { id: string; name: string };

export type BoardSprintPick = { id: string; name: string };
