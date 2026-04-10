import { MaintenanceStatus } from '@prisma/client';
import { MAINTENANCE_STATUS_LABEL } from '@/lib/maintenance-labels';
import { cn } from '@/lib/utils';

const META: Record<MaintenanceStatus, { className: string }> = {
  [MaintenanceStatus.backlog]: {
    className: 'bg-border text-muted-foreground',
  },
  [MaintenanceStatus.in_progress]: {
    className: 'bg-primary/15 text-primary',
  },
  [MaintenanceStatus.awaiting_approval]: {
    className: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  },
  [MaintenanceStatus.on_check]: {
    className: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  },
  [MaintenanceStatus.need_revision]: {
    className: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  },
  [MaintenanceStatus.completed]: {
    className: 'bg-success/15 text-success',
  },
  [MaintenanceStatus.canceled]: {
    className: 'bg-muted text-muted-foreground',
  },
  [MaintenanceStatus.on_hold]: {
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
