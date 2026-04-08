import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export type RecordActivityLogInput = {
  /** Opsional: meeting global tanpa proyek boleh null */
  projectId?: string | null;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  actorId: string;
  /** Jika diisi, menghindari query user tambahan */
  actorName?: string;
  changes?: unknown;
  metadata?: unknown;
};

/**
 * Mencatat ke `activity_logs`. Gagal diam-diam agar tidak merusak aksi bisnis utama.
 */
export async function recordActivityLog(
  input: RecordActivityLogInput,
): Promise<void> {
  try {
    let actorName = input.actorName?.trim();
    if (!actorName) {
      const u = await prisma.user.findUnique({
        where: { id: input.actorId },
        select: { name: true },
      });
      actorName = u?.name ?? 'Pengguna';
    }

    await prisma.activityLog.create({
      data: {
        projectId: input.projectId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName.slice(0, 500),
        action: input.action.slice(0, 120),
        actorId: input.actorId,
        actorName: actorName.slice(0, 200),
        changes:
          input.changes === undefined
            ? undefined
            : (input.changes as object),
        metadata:
          input.metadata === undefined
            ? undefined
            : (input.metadata as object),
      },
    });

    if (input.projectId) {
      revalidatePath(`/projects/${input.projectId}/log`);
    }
  } catch {
    /* abaikan */
  }
}
