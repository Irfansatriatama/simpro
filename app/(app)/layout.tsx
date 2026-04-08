import { SignOutButton } from '@/components/sign-out-button';
import { auth } from '@/lib/auth';
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

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 border-r border-border bg-card md:block">
        <div className="p-4 text-sm font-semibold text-foreground">
          {process.env.NEXT_PUBLIC_APP_NAME ?? 'SIMPRO'}
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 text-sm text-muted">
          <span>Shell — sidebar & topbar di Phase 3</span>
          <SignOutButton />
        </header>
        <div className="flex-1 p-4">{children}</div>
      </div>
    </div>
  );
}
