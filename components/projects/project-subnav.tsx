'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const ITEMS: { suffix: string; label: string }[] = [
  { suffix: '', label: 'Ringkasan' },
  { suffix: '/backlog', label: 'Backlog' },
  { suffix: '/board', label: 'Board' },
  { suffix: '/sprint', label: 'Sprint' },
  { suffix: '/gantt', label: 'Gantt' },
  { suffix: '/maintenance', label: 'Maintenance' },
  { suffix: '/maintenance-report', label: 'Laporan maint.' },
  { suffix: '/reports', label: 'Laporan' },
  { suffix: '/discussion', label: 'Diskusi' },
  { suffix: '/log', label: 'Log' },
];

export function ProjectSubnav({ projectId }: { projectId: string }) {
  const pathname = usePathname() ?? '';
  const base = `/projects/${projectId}`;

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border"
      aria-label="Sub-navigasi proyek"
    >
      {ITEMS.map(({ suffix, label }) => {
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
