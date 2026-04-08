import { TaskStatus } from '@prisma/client';

import type { AppRole } from '@/lib/nav-config';
import {
  canManageProjects,
  projectListWhere,
} from '@/lib/project-access';
import { PROJECT_STATUS_LABEL } from '@/lib/project-labels';
import { prisma } from '@/lib/prisma';
import { PRIORITY_LABEL, TASK_STATUS_LABEL } from '@/lib/task-labels';

export type DashboardProjectRow = {
  id: string;
  code: string;
  name: string;
  progress: number;
  status: string;
  statusLabel: string;
  updatedAt: string;
};

export type DashboardTaskRow = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  priority: string;
  priorityLabel: string;
  projectId: string;
  projectCode: string;
  projectName: string;
};

export type DashboardSnapshot = {
  displayName: string;
  projectCount: number;
  projects: DashboardProjectRow[];
  myOpenTaskCount: number;
  myTasks: DashboardTaskRow[];
  unreadNotifications: number;
  canManage: boolean;
  isAdmin: boolean;
};

const OPEN_TASK_STATUS: TaskStatus[] = [
  TaskStatus.backlog,
  TaskStatus.todo,
  TaskStatus.in_progress,
  TaskStatus.in_review,
];

export async function getDashboardSnapshot(
  userId: string,
  role: AppRole,
  displayName: string,
): Promise<DashboardSnapshot> {
  const projectWhere = projectListWhere(userId, role);
  const canManage = canManageProjects(role);

  const taskOpenWhere = {
    assignees: { some: { userId } },
    status: { in: OPEN_TASK_STATUS },
    project: projectWhere,
  };

  const [
    projectCount,
    projectsRaw,
    myOpenTaskCount,
    myTasksRaw,
    unreadNotifications,
  ] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.project.findMany({
      where: projectWhere,
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        code: true,
        name: true,
        progress: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.task.count({ where: taskOpenWhere }),
    prisma.task.findMany({
      where: taskOpenWhere,
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        project: { select: { code: true, name: true } },
      },
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  const projects: DashboardProjectRow[] = projectsRaw.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    progress: p.progress,
    status: p.status,
    statusLabel: PROJECT_STATUS_LABEL[p.status],
    updatedAt: p.updatedAt.toISOString(),
  }));

  const myTasks: DashboardTaskRow[] = myTasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    statusLabel: TASK_STATUS_LABEL[t.status],
    priority: t.priority,
    priorityLabel: PRIORITY_LABEL[t.priority],
    projectId: t.projectId,
    projectCode: t.project.code,
    projectName: t.project.name,
  }));

  return {
    displayName,
    projectCount,
    projects,
    myOpenTaskCount,
    myTasks,
    unreadNotifications,
    canManage,
    isAdmin: role === 'admin',
  };
}
