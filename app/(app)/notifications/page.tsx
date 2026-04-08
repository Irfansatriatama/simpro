import { NotificationsPageClient } from '@/components/notifications/notifications-page-client';
import { toNotificationDTO } from '@/lib/notification-serialize';
import { requireSessionUser } from '@/lib/require-session';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const s = await requireSessionUser();
  if (!s) redirect('/login');

  const rows = await prisma.notification.findMany({
    where: { userId: s.userId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <NotificationsPageClient rows={rows.map(toNotificationDTO)} />
  );
}
