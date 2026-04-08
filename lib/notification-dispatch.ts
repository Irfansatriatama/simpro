import { prisma } from '@/lib/prisma';

export type NotifyUsersInput = {
  recipientUserIds: string[];
  actorId: string;
  actorName: string;
  actorAvatar?: string | null;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  message: string;
  projectId?: string | null;
  projectName?: string | null;
};

/** Konteks proyek untuk pesan notifikasi (nama singkat + anggota). */
export async function projectNotifyContext(projectId: string): Promise<{
  projectName: string | null;
  memberIds: string[];
}> {
  const [proj, members] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, code: true },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    }),
  ]);
  const projectName = proj
    ? `${proj.code} — ${proj.name}`.slice(0, 200)
    : null;
  return {
    projectName,
    memberIds: members.map((m) => m.userId),
  };
}

/**
 * Membuat notifikasi untuk banyak penerima. Aktor tidak menerima salinan.
 * Gagal diam-diam agar tidak merusak alur bisnis utama.
 */
export async function notifyUsers(input: NotifyUsersInput): Promise<void> {
  const ids = Array.from(new Set(input.recipientUserIds)).filter(
    (id) => id && id !== input.actorId,
  );
  if (ids.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        actorId: input.actorId,
        actorName: input.actorName.slice(0, 200),
        actorAvatar: input.actorAvatar ?? null,
        entityType: input.entityType.slice(0, 80),
        entityId: input.entityId,
        entityName: input.entityName.slice(0, 500),
        action: input.action.slice(0, 120),
        message: input.message.slice(0, 2000),
        projectId: input.projectId ?? null,
        projectName: input.projectName?.slice(0, 200) ?? null,
        read: false,
      })),
    });
  } catch {
    /* abaikan */
  }
}

export async function actorNotificationProfile(userId: string): Promise<{
  name: string;
  image: string | null;
}> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, image: true },
  });
  return { name: u?.name ?? 'Pengguna', image: u?.image ?? null };
}
