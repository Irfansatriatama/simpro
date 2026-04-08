'use client';

import { Bell, Menu, Search } from 'lucide-react';
import Link from 'next/link';

import { signOutAction } from '@/app/actions/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { AppRole } from '@/lib/nav-config';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrator',
  pm: 'Project Manager',
  developer: 'Developer',
  viewer: 'Viewer',
  client: 'Klien',
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type TopbarProps = {
  userName: string;
  userEmail: string | null;
  userImage: string | null;
  role: AppRole;
  onMenuClick: () => void;
};

export function Topbar({
  userName,
  userEmail,
  userImage,
  role,
  onMenuClick,
}: TopbarProps) {
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden min-w-0 flex-1 md:block md:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          readOnly
          placeholder="Cari proyek, tugas, catatan…"
          className="h-9 cursor-default bg-surface pl-9"
          aria-label="Pencarian (segera hadir)"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1 md:flex-none">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-label="Notifikasi"
          title="Notifikasi (segera hadir)"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-10 gap-2 px-2 text-left font-normal"
            >
              <Avatar className="h-8 w-8">
                {userImage ? (
                  <AvatarImage src={userImage} alt="" />
                ) : null}
                <AvatarFallback>{initials(userName)}</AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 flex-col items-start sm:flex">
                <span className="max-w-[10rem] truncate text-sm font-medium text-foreground">
                  {userName}
                </span>
                <span className="max-w-[10rem] truncate text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="truncate text-sm font-medium">{userName}</p>
                {userEmail ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {userEmail}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" prefetch>
                Dashboard
              </Link>
            </DropdownMenuItem>
            {(role === 'admin' || role === 'pm') && (
              <DropdownMenuItem asChild>
                <Link href="/settings" prefetch>
                  Pengaturan
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer p-0 focus:bg-transparent"
              onSelect={(e) => e.preventDefault()}
            >
              <form action={signOutAction} className="w-full">
                <button
                  type="submit"
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                    'text-danger hover:bg-border/50 focus-visible:bg-border/50',
                  )}
                >
                  Keluar
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
