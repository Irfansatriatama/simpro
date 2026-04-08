'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  filterNavSections,
  isNavActive,
  type AppRole,
} from '@/lib/nav-config';
import { cn } from '@/lib/utils';

export const SIDEBAR_STORAGE_KEY = 'simpro_sidebar_collapsed';

export type SidebarProps = {
  appName: string;
  role: AppRole;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  variant: 'desktop' | 'mobile';
  onNavigate?: () => void;
};

function NavLinkButton({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  const inner = (
    <Link
      href={href}
      prefetch
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-border/50 hover:text-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="right" className="font-normal">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  appName,
  role,
  collapsed,
  onToggleCollapse,
  variant,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname() ?? '';
  const sections = filterNavSections(role);

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border px-3',
          collapsed && variant === 'desktop' && 'justify-center px-2',
        )}
      >
        <Link
          href="/dashboard"
          prefetch
          onClick={onNavigate}
          className={cn(
            'flex min-w-0 items-center gap-2 font-semibold text-foreground',
            collapsed && variant === 'desktop' && 'justify-center',
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutGrid className="h-5 w-5" />
          </span>
          {!(collapsed && variant === 'desktop') && (
            <span className="truncate text-sm">{appName}</span>
          )}
        </Link>
      </div>

      <nav
        id="app-sidebar-nav"
        className="flex-1 space-y-4 overflow-y-auto p-3"
      >
        {sections.map((section, i) => (
          <div key={i}>
            {section.title ? (
              <p
                className={cn(
                  'mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                  collapsed && variant === 'desktop' && 'sr-only',
                )}
              >
                {section.title}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLinkButton
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed && variant === 'desktop'}
                  active={isNavActive(item.href, pathname)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
            {i < sections.length - 1 ? (
              <Separator className={cn('my-3', collapsed && 'mx-1')} />
            ) : null}
          </div>
        ))}
      </nav>

      {variant === 'desktop' && onToggleCollapse ? (
        <div className="shrink-0 border-t border-border p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('w-full justify-start gap-2', collapsed && 'px-2')}
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar-nav"
            title={
              collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'
            }
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronLeft className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && (
              <span className="text-xs text-muted-foreground">
                Ciutkan sidebar
              </span>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
