'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/actions/notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificationHref } from '@/lib/notification-href';
import type { NotificationDTO } from '@/lib/notification-types';
import { cn } from '@/lib/utils';

function fmtShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function NotificationBell(props: {
  preview: NotificationDTO[];
  unreadCount: number;
}) {
  const { preview, unreadCount } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markOne(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      await markNotificationReadAction(fd);
      router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      const r = await markAllNotificationsReadAction();
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold text-foreground">
            Notifikasi
          </span>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={pending}
              onClick={markAll}
            >
              Tandai semua dibaca
            </Button>
          ) : null}
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {preview.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Belum ada notifikasi.
            </li>
          ) : (
            preview.map((n) => {
              const href = notificationHref(n);
              return (
                <li key={n.id}>
                  <Link
                    href={href}
                    className={cn(
                      'block border-b border-border/60 px-3 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-surface/80',
                      !n.read && 'bg-primary/5',
                    )}
                    onClick={() => {
                      if (!n.read) markOne(n.id);
                    }}
                  >
                    <p className="line-clamp-2 text-foreground">{n.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{n.actorName}</span>
                      <span>{fmtShort(n.createdAt)}</span>
                      {n.projectName ? (
                        <span className="truncate">{n.projectName}</span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
        <DropdownMenuSeparator className="my-0" />
        <div className="p-2">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/notifications">Lihat semua</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
