import { PlaceholderPage } from '@/components/placeholder-page';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="space-y-2">
      <PlaceholderPage title="Dashboard" />
      {session?.user ? (
        <p className="text-sm text-muted">
          Masuk sebagai{' '}
          <span className="font-medium text-foreground">{session.user.name}</span>
          {session.user.email ? ` (${session.user.email})` : null}
        </p>
      ) : null}
    </div>
  );
}
