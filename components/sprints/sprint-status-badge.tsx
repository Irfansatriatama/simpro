import { cn } from '@/lib/utils';
import { isSprintStatus, sprintStatusLabel } from '@/lib/sprint-constants';

const META: Record<
  string,
  { label: string; className: string }
> = {
  planning: {
    label: 'Perencanaan',
    className: 'bg-border text-muted-foreground',
  },
  active: {
    label: 'Berjalan',
    className: 'bg-primary/15 text-primary',
  },
  completed: {
    label: 'Selesai',
    className: 'bg-success/15 text-success',
  },
  cancelled: {
    label: 'Dibatalkan',
    className: 'bg-destructive/15 text-destructive',
  },
};

export function SprintStatusBadge({ status }: { status: string }) {
  if (!isSprintStatus(status)) {
    return (
      <span
        className={cn(
          'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
          'bg-border text-muted-foreground',
        )}
      >
        {sprintStatusLabel(status)}
      </span>
    );
  }
  const m = META[status];
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
