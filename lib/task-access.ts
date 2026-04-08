import type { AppRole } from '@/lib/nav-config';

/**
 * Siapa boleh mengubah tugas di proyek:
 * - admin & PM: selama bisa akses proyek
 * - developer: harus anggota proyek
 * - viewer & client: hanya baca
 */
export function canEditTasksInProject(
  role: AppRole,
  isProjectMember: boolean,
): boolean {
  if (role === 'admin' || role === 'pm') return true;
  if (role === 'developer') return isProjectMember;
  return false;
}
