import type { Session } from '@/lib/auth';
import type { AppRole } from '@/lib/nav-config';

export function getUserRole(session: Session | null): AppRole {
  if (!session?.user) return 'developer';
  const raw = (session.user as { role?: string }).role;
  const allowed: AppRole[] = [
    'admin',
    'pm',
    'developer',
    'viewer',
    'client',
  ];
  if (raw && allowed.includes(raw as AppRole)) return raw as AppRole;
  return 'developer';
}
