import type {
  Priority,
  ProjectPhase,
  ProjectStatus,
} from '@prisma/client';

export type ProjectListRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  phase: ProjectPhase | null;
  priority: Priority;
  progress: number;
  coverColor: string;
  clientId: string | null;
  clientName: string | null;
  parentId: string | null;
  parentCode: string | null;
  startDate: string | null;
  endDate: string | null;
  tags: string[];
  memberCount: number;
  updatedAt: string;
};

export type ProjectMemberRow = {
  id: string;
  userId: string;
  projectRole: string;
  name: string;
  email: string;
  username: string;
  image: string | null;
};

export type ProjectDetailPayload = {
  project: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    phase: ProjectPhase | null;
    priority: Priority;
    progress: number;
    coverColor: string;
    budget: number;
    actualCost: number;
    tags: string[];
    clientId: string | null;
    clientName: string | null;
    parentId: string | null;
    parentCode: string | null;
    startDate: string | null;
    endDate: string | null;
    actualEndDate: string | null;
    createdAt: string;
    updatedAt: string;
    subProjectCount: number;
  };
  members: ProjectMemberRow[];
};

export type UserPickRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  image: string | null;
};
