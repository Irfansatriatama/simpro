import type { Priority, TaskStatus, TaskType } from '@prisma/client';

export type TaskAssigneeRow = {
  userId: string;
  name: string;
  username: string;
};

export type TaskDependencyRow = {
  id: string;
  title: string;
};

export type BacklogTaskRow = {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  storyPoints: number | null;
  sprintId: string | null;
  sprintName: string | null;
  epicId: string | null;
  epicTitle: string | null;
  reporterId: string | null;
  reporterName: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  tags: string[];
  timeLogged: number;
  createdAt: string;
  updatedAt: string;
  assignees: TaskAssigneeRow[];
  /** Tugas ini bergantung pada (prerequisite) */
  dependsOn: TaskDependencyRow[];
  commentCount: number;
  checklistCount: number;
  attachmentCount: number;
};

export type ProjectMemberPick = {
  id: string;
  name: string;
  username: string;
  email: string;
};

export type SprintPick = { id: string; name: string; status: string };

export type EpicPick = { id: string; title: string };
