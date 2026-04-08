import { UserStatus } from '@prisma/client';

import { cn } from '@/lib/utils';

const STATUS_META: Record<
  UserStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Aktif',
    className: 'bg-success/15 text-success',
  },
  inactive: {
    label: 'Nonaktif',
    className: 'bg-border text-muted-foreground',
  },
  invited: {
    label: 'Diundang',
    className: 'bg-warning/15 text-warning',
  },
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        m.className,
      )}
    >
      {m.label}
    </span>
  );
}
