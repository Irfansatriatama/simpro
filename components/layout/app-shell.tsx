'use client';

import { useEffect, useState } from 'react';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AppRole } from '@/lib/nav-config';

import { cn } from '@/lib/utils';

import { Sidebar, SIDEBAR_STORAGE_KEY } from './sidebar';
import { Topbar } from './topbar';

export type AppShellProps = {
  appName: string;
  userName: string;
  userEmail: string | null;
  userImage: string | null;
  role: AppRole;
  children: React.ReactNode;
};

export function AppShell({
  appName,
  userName,
  userEmail,
  userImage,
  role,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1') {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen bg-surface">
        <aside
          className={cn(
            'hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 ease-out md:block',
            collapsed ? 'w-[72px]' : 'w-56',
          )}
        >
          <Sidebar
            appName={appName}
            role={role}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
            variant="desktop"
          />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
            <Sidebar
              appName={appName}
              role={role}
              collapsed={false}
              variant="mobile"
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
            role={role}
            onMenuClick={() => setMobileOpen(true)}
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
