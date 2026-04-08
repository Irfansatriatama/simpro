import { AppShell } from '@/components/layout/app-shell';
import { auth } from '@/lib/auth';
import { getOrgSettings } from '@/lib/org-settings';
import { toNotificationDTO } from '@/lib/notification-serialize';
import { getUserRole } from '@/lib/session-user';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const user = session.user;
  const userId = user.id;

  const [org, previewRows, unreadNotificationCount] = await Promise.all([
    getOrgSettings(),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  const appName = org.systemName.trim() || 'SIMPRO';

  return (
    <AppShell
      appName={appName}
      userName={user.name ?? user.email ?? 'Pengguna'}
      userEmail={user.email ?? null}
      userImage={user.image ?? null}
      role={getUserRole(session)}
      notificationPreview={previewRows.map(toNotificationDTO)}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}
