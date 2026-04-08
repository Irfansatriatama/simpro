import { AppShell } from '@/components/layout/app-shell';
import { auth } from '@/lib/auth';
import { getOrgSettings } from '@/lib/org-settings';
import { getUserRole } from '@/lib/session-user';
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
  const org = await getOrgSettings();
  const appName = org.systemName.trim() || 'SIMPRO';

  return (
    <AppShell
      appName={appName}
      userName={user.name ?? user.email ?? 'Pengguna'}
      userEmail={user.email ?? null}
      userImage={user.image ?? null}
      role={getUserRole(session)}
    >
      {children}
    </AppShell>
  );
}
