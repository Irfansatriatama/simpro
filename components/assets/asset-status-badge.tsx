import { cn } from '@/lib/utils';
import {
  ASSET_STATUS_LABEL,
  isAssetStatus,
  type AssetStatus,
} from '@/lib/asset-constants';

const VARIANT: Record<
  AssetStatus,
  { label: string; className: string }
> = {
  available: {
    label: ASSET_STATUS_LABEL.available,
    className: 'bg-success/15 text-success',
  },
  in_use: {
    label: ASSET_STATUS_LABEL.in_use,
    className: 'bg-primary/15 text-primary',
  },
  maintenance: {
    label: ASSET_STATUS_LABEL.maintenance,
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  retired: {
    label: ASSET_STATUS_LABEL.retired,
    className: 'bg-border text-muted-foreground',
  },
};

export function AssetStatusBadge({ status }: { status: string }) {
  const key = isAssetStatus(status) ? status : 'available';
  const m = VARIANT[key];
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
