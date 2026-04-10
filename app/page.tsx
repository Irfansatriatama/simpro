import { auth } from '@/lib/auth';
import { getBootstrapState } from '@/lib/bootstrap';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const boot = await getBootstrapState();
  if (!boot.ok) {
    redirect('/db-unavailable');
  }
  if (boot.needsSetup) {
    redirect('/setup');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect('/dashboard');
  }

  redirect('/login');
}
