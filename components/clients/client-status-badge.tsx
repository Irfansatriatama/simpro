import { cn } from '@/lib/utils';
import { isClientStatus } from '@/lib/client-types';

const META: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Aktif',
    className: 'bg-success/15 text-success',
  },
  inactive: {
    label: 'Nonaktif',
    className: 'bg-border text-muted-foreground',
  },
};

export function ClientStatusBadge({ status }: { status: string }) {
  const key = isClientStatus(status) ? status : 'inactive';
  const m = META[key] ?? META.inactive;
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
