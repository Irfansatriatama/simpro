import {
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  FolderKanban,
  Package,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { DashboardSnapshot } from '@/lib/dashboard-data';

function fmtShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export function DashboardOverview({ data }: { data: DashboardSnapshot }) {
  const {
    displayName,
    projectCount,
    projects,
    myOpenTaskCount,
    myTasks,
    unreadNotifications,
    canManage,
    isAdmin,
  } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ringkasan untuk{' '}
          <span className="font-medium text-foreground">{displayName}</span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/projects"
          className="rounded-lg border border-border bg-card p-4 shadow-card transition-colors hover:bg-surface/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {projectCount}
              </p>
              <p className="text-sm text-muted-foreground">Proyek diakses</p>
            </div>
          </div>
        </Link>

        <div className="rounded-lg border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {myOpenTaskCount}
              </p>
              <p className="text-sm text-muted-foreground">
                Tugas terbuka untuk Anda
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/notifications"
          className="rounded-lg border border-border bg-card p-4 shadow-card transition-colors hover:bg-surface/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/15 text-destructive">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {unreadNotifications}
              </p>
              <p className="text-sm text-muted-foreground">
                Notifikasi belum dibaca
              </p>
            </div>
          </div>
        </Link>

        <div className="rounded-lg border border-dashed border-border bg-card/50 p-4 shadow-card sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-medium text-foreground">Pintasan</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">Proyek</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/notes">Catatan</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/notifications">Notifikasi</Link>
            </Button>
            {canManage ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/clients" className="gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Klien
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/meetings" className="gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Meetings
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/assets" className="gap-1">
                    <Package className="h-3.5 w-3.5" />
                    Aset
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings" className="gap-1">
                    <Settings className="h-3.5 w-3.5" />
                    Pengaturan
                  </Link>
                </Button>
              </>
            ) : null}
            {isAdmin ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/members" className="gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Anggota
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Proyek terbaru
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">Lihat semua</Link>
            </Button>
          </div>
          {projects.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Belum ada proyek.{' '}
              {canManage ? (
                <Link href="/projects" className="text-primary hover:underline">
                  Buat atau buka daftar proyek
                </Link>
              ) : (
                'Hubungi PM untuk diundang ke proyek.'
              )}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        <span className="font-mono text-xs text-muted-foreground">
                          {p.code}
                        </span>{' '}
                        {p.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.statusLabel} · {p.progress}% · {fmtShort(p.updatedAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Tugas untuk Anda
            </h2>
            {myOpenTaskCount > 0 ? (
              <span className="text-xs text-muted-foreground">
                {myOpenTaskCount} terbuka
                {myTasks.length < myOpenTaskCount
                  ? ` · menampilkan ${myTasks.length}`
                  : ''}
              </span>
            ) : null}
          </div>
          {myTasks.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Tidak ada tugas terbuka yang ditugaskan kepada Anda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {myTasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/projects/${t.projectId}/backlog`}
                    className="block px-4 py-3 text-sm transition-colors hover:bg-surface/60"
                  >
                    <p className="font-medium text-foreground">{t.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{t.projectCode}</span> —{' '}
                      {t.projectName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.statusLabel} · Prioritas {t.priorityLabel}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
