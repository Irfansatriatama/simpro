'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

type Item = {
  suffix: string;
  label: string;
  maintenanceOnly?: boolean;
  logOnly?: boolean;
};

const ITEMS: Item[] = [
  { suffix: '', label: 'Ringkasan' },
  { suffix: '/board', label: 'Board' },
  { suffix: '/backlog', label: 'Backlog' },
  { suffix: '/sprint', label: 'Sprint' },
  { suffix: '/gantt', label: 'Gantt' },
  { suffix: '/discussion', label: 'Diskusi' },
  { suffix: '/maintenance', label: 'Maintenance', maintenanceOnly: true },
  { suffix: '/reports', label: 'Laporan' },
  { suffix: '/log', label: 'Log', logOnly: true },
];

export function ProjectSubnav(props: {
  projectId: string;
  showMaintenance?: boolean;
  showLog?: boolean;
}) {
  const {
    projectId,
    showMaintenance = false,
    showLog = false,
  } = props;
  const pathname = usePathname() ?? '';
  const base = `/projects/${projectId}`;

  const visible = ITEMS.filter((item) => {
    if (item.maintenanceOnly && !showMaintenance) return false;
    if (item.logOnly && !showLog) return false;
    return true;
  });

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border"
      aria-label="Sub-navigasi proyek"
    >
      {visible.map(({ suffix, label }) => {
        const href = `${base}${suffix}`;
        const active =
          suffix === ''
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={suffix || 'overview'}
            href={href}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
