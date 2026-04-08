import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import type { AppRole } from '@/lib/nav-config';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';

export type BacklogAccessContext = {
  userId: string;
  role: AppRole;
  canEdit: boolean;
};

/** Sesi + visibilitas proyek + hak sunting tugas (anggota/dev, admin/PM). */
export async function requireBacklogAccess(
  projectId: string,
): Promise<BacklogAccessContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  const userId = session.user.id;
  const role = getUserRole(session);
  const project = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, projectId),
    select: { id: true },
  });
  if (!project) return null;
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  const canEdit = canEditTasksInProject(role, !!member);
  return { userId, role, canEdit };
}
