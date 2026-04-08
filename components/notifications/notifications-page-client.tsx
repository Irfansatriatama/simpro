'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/actions/notifications';
import { Button } from '@/components/ui/button';
import { notificationHref } from '@/lib/notification-href';
import type { NotificationDTO } from '@/lib/notification-types';
import { cn } from '@/lib/utils';

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type Filter = 'all' | 'unread';

export function NotificationsPageClient(props: { rows: NotificationDTO[] }) {
  const { rows } = props;
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === 'unread') return rows.filter((r) => !r.read);
    return rows;
  }, [rows, filter]);

  const unreadCount = useMemo(() => rows.filter((r) => !r.read).length, [rows]);

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Notifikasi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pusat notifikasi. Tautan membuka modul terkait.
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={markAll}
          >
            Tandai semua dibaca
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Semua ({rows.length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={filter === 'unread' ? 'default' : 'outline'}
          onClick={() => setFilter('unread')}
        >
          Belum dibaca ({unreadCount})
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border bg-card shadow-card">
        {filtered.length === 0 ? (
          <li className="px-4 py-12 text-center text-sm text-muted-foreground">
            Tidak ada notifikasi di filter ini.
          </li>
        ) : (
          filtered.map((n) => {
            const href = notificationHref(n);
            return (
              <li key={n.id}>
                <div
                  className={cn(
                    'flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between',
                    !n.read && 'bg-primary/5',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={href}
                      className="font-medium text-foreground hover:text-primary"
                      onClick={() => {
                        if (!n.read) markOne(n.id);
                      }}
                    >
                      {n.message}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.actorName} · {fmtWhen(n.createdAt)}
                      {n.projectName ? ` · ${n.projectName}` : ''}
                    </p>
                  </div>
                  {!n.read ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      disabled={pending}
                      onClick={() => markOne(n.id)}
                    >
                      Tandai dibaca
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
