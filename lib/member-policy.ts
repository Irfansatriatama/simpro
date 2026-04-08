import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type PolicyResult = { ok: true } | { ok: false; error: string };

/**
 * Pastikan tidak menghapus satu-satunya admin aktif (ganti role atau nonaktifkan).
 */
export async function assertCanChangeAdminMembership(input: {
  userId: string;
  currentRole: UserRole;
  currentStatus: UserStatus;
  nextRole: UserRole;
  nextStatus: UserStatus;
}): Promise<PolicyResult> {
  const wasAdminActive =
    input.currentRole === UserRole.admin &&
    input.currentStatus === UserStatus.active;

  const willBeAdminActive =
    input.nextRole === UserRole.admin &&
    input.nextStatus === UserStatus.active;

  if (wasAdminActive && !willBeAdminActive) {
    const otherActiveAdmins = await prisma.user.count({
      where: {
        role: UserRole.admin,
        status: UserStatus.active,
        id: { not: input.userId },
      },
    });
    if (otherActiveAdmins === 0) {
      return {
        ok: false,
        error: 'Harus ada minimal satu administrator aktif.',
      };
    }
  }

  return { ok: true };
}
