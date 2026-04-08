import { MaintenanceStatus } from '@prisma/client';
import { MAINTENANCE_STATUS_LABEL } from '@/lib/maintenance-labels';
import { cn } from '@/lib/utils';

const META: Record<
  MaintenanceStatus,
  { className: string }
> = {
  [MaintenanceStatus.open]: {
    className: 'bg-border text-muted-foreground',
  },
  [MaintenanceStatus.in_progress]: {
    className: 'bg-primary/15 text-primary',
  },
  [MaintenanceStatus.resolved]: {
    className: 'bg-success/15 text-success',
  },
  [MaintenanceStatus.closed]: {
    className: 'bg-muted text-muted-foreground',
  },
  [MaintenanceStatus.rejected]: {
    className: 'bg-danger/15 text-danger',
  },
};

export function MaintenanceStatusBadge({
  status,
}: {
  status: MaintenanceStatus;
}) {
  const m = META[status];
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        m.className,
      )}
    >
      {MAINTENANCE_STATUS_LABEL[status]}
    </span>
  );
}
