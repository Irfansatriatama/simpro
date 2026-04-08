import { auth } from '@/lib/auth';
import { needsBootstrap } from '@/lib/bootstrap';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

type Props = { searchParams: { setup?: string } };

export default async function LoginPage({ searchParams }: Props) {
  if (await needsBootstrap()) {
    redirect('/setup');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect('/dashboard');
  }

  const fromSetup = searchParams.setup === '1';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-foreground">
          {process.env.NEXT_PUBLIC_APP_NAME ?? 'SIMPRO'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Masuk dengan username atau email beserta password
        </p>
        {fromSetup ? (
          <p className="mt-2 rounded-md bg-info/10 px-3 py-2 text-xs text-foreground">
            Admin sudah dibuat. Silakan masuk dengan kredensial Anda.
          </p>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
