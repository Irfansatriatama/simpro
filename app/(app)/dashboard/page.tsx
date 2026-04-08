import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { getDashboardSnapshot } from '@/lib/dashboard-data';
import { auth } from '@/lib/auth';
import { getUserRole } from '@/lib/session-user';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const displayName =
    session.user.name ?? session.user.email ?? 'Pengguna';

  const data = await getDashboardSnapshot(userId, role, displayName);

  return <DashboardOverview data={data} />;
}
