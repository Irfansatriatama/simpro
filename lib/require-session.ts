import { headers } from 'next/headers';

import { auth } from '@/lib/auth';

export type SessionUser = { userId: string; name: string };

/** Pengguna terautentikasi (semua peran). */
export async function requireSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    name: session.user.name ?? session.user.email ?? 'Pengguna',
  };
}
