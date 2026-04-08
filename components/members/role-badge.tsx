import { UserRole } from '@prisma/client';

import { cn } from '@/lib/utils';

const ROLE_META: Record<
  UserRole,
  { label: string; className: string }
> = {
  admin: {
    label: 'Admin',
    className: 'bg-danger/15 text-danger',
  },
  pm: {
    label: 'PM',
    className: 'bg-primary/15 text-primary',
  },
  developer: {
    label: 'Developer',
    className: 'bg-info/15 text-info',
  },
  viewer: {
    label: 'Viewer',
    className: 'bg-border/80 text-foreground',
  },
  client: {
    label: 'Klien',
    className: 'bg-secondary/15 text-secondary',
  },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const m = ROLE_META[role];
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold',
        m.className,
      )}
    >
      {m.label}
    </span>
  );
}
