import { auth } from '@/lib/auth';
import { needsBootstrap } from '@/lib/bootstrap';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (await needsBootstrap()) {
    redirect('/setup');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect('/dashboard');
  }

  redirect('/login');
}
