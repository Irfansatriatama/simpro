import type { Prisma } from '@prisma/client';

import type { AppRole } from '@/lib/nav-config';

/** Admin & PM melihat semua proyek; lainnya hanya proyek yang diikuti. */
export function projectListWhere(
  userId: string,
  role: AppRole,
): Prisma.ProjectWhereInput {
  if (role === 'admin' || role === 'pm') return {};
  return { members: { some: { userId } } };
}

export function canManageProjects(role: AppRole): boolean {
  return role === 'admin' || role === 'pm';
}

/** Lihat detail proyek: admin/pm semua; lainnya harus anggota. */
export function projectViewWhere(
  userId: string,
  role: AppRole,
  projectId: string,
): Prisma.ProjectWhereInput {
  if (role === 'admin' || role === 'pm') {
    return { id: projectId };
  }
  return { id: projectId, members: { some: { userId } } };
}
