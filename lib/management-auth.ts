import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/** Admin atau PM — modul manajemen (klien, aset, meeting, pengaturan). */
export async function requireManagementSession(): Promise<{
  userId: string;
  role: string;
} | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || !role) return null;
  if (role !== 'admin' && role !== 'pm') return null;
  return { userId: session.user.id, role };
}
