'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BarChart2,
  Clock,
  Filter,
  Package,
  Printer,
  TrendingDown,
  Users,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ReportsPayload } from '@/lib/reports-types';
import { cn } from '@/lib/utils';

type TabId =
  | 'progress'
  | 'workload'
  | 'burndown'
  | 'maintenance'
  | 'assets'
  | 'timetracking';

const TABS: {
  id: TabId;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: 'progress', label: 'Kemajuan proyek', icon: BarChart2 },
  { id: 'workload', label: 'Beban tim', icon: Users },
  { id: 'burndown', label: 'Ringkasan sprint', icon: TrendingDown },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'assets', label: 'Aset', icon: Package },
  { id: 'timetracking', label: 'Waktu tercatat', icon: Clock },
];

function BarList(props: {
  rows: { label: string; count: number }[];
  accentClass?: string;
}) {
  const { rows, accentClass = 'bg-primary/85' } = props;
  const max = useMemo(
    () => Math.max(1, ...rows.map((r) => r.count)),
    [rows],
  );
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-foreground">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {r.count}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/60">
            <div
              className={cn('h-full rounded-full transition-all', accentClass)}
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function fmtMin(m: number): string {
  if (m < 60) return `${m} m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} j ${r} m` : `${h} j`;
}

export function ReportsClient(props: {
  projectId: string;
  projectName: string;
  payload: ReportsPayload;
  queryFrom: string;
  queryTo: string;
}) {
  const { projectId, projectName, payload, queryFrom, queryTo } = props;
  const [tab, setTab] = useState<TabId>('progress');

  function printReport() {
    window.print();
  }

  return (
    <div className="space-y-6" id="reports-root">
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-1 text-xs text-muted-foreground">
            <Link
              href={`/projects/${projectId}`}
              className="text-primary hover:underline"
            >
              {projectName}
            </Link>
            <span className="mx-1.5">/</span>
            <span>Laporan</span>
          </nav>
          <h1 className="text-2xl font-semibold text-foreground">Laporan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan agregat dari tugas, sprint, maintenance, dan aset proyek.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2 print:hidden"
          onClick={printReport}
        >
          <Printer className="h-4 w-4" />
          Cetak / PDF
        </Button>
      </div>

      <form
        method="get"
        action={`/projects/${projectId}/reports`}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 shadow-card print:hidden"
      >
        <div className="grid gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Dari
          </label>
          <Input type="date" name="from" defaultValue={queryFrom} />
        </div>
        <div className="grid gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Sampai
          </label>
          <Input type="date" name="to" defaultValue={queryTo} />
        </div>
        <Button type="submit" className="gap-1.5">
          <Filter className="h-4 w-4" />
          Terapkan
        </Button>
        {(queryFrom || queryTo) ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/projects/${projectId}/reports`}>Hapus filter</Link>
          </Button>
        ) : null}
        {payload.filterActive ? (
          <p className="w-full text-xs text-muted-foreground">
            Filter memakai tanggal pembaruan tugas / tiket (selesai atau terakhir
            diubah).
          </p>
        ) : null}
      </form>

      <div
        className="flex flex-wrap gap-1 border-b border-border print:hidden"
        role="tablist"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'border-border bg-card text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab(id)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-card print:border-0 print:shadow-none">
        {tab === 'progress' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Total tugas dalam filter:{' '}
              <strong className="text-foreground">{payload.progress.total}</strong>
            </p>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Menurut status
                </h2>
                <BarList
                  rows={payload.progress.byStatus.map((r) => ({
                    label: r.label,
                    count: r.count,
                  }))}
                />
              </div>
              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Menurut tipe
                </h2>
                <BarList
                  rows={payload.progress.byType.map((r) => ({
                    label: r.label,
                    count: r.count,
                  }))}
                  accentClass="bg-secondary/80"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'workload' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Anggota</th>
                  <th className="py-2 pr-3 font-medium tabular-nums">
                    Penugasan
                  </th>
                  <th className="py-2 pr-3 font-medium tabular-nums">Terbuka</th>
                  <th className="py-2 font-medium tabular-nums">
                    Story points (dibagi)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payload.workload.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Tidak ada data penugasan.
                    </td>
                  </tr>
                ) : (
                  payload.workload.map((w) => (
                    <tr key={w.userId}>
                      <td className="py-2 pr-3 font-medium">{w.name}</td>
                      <td className="py-2 pr-3 tabular-nums">{w.assigned}</td>
                      <td className="py-2 pr-3 tabular-nums">{w.open}</td>
                      <td className="py-2 tabular-nums">{w.storyPoints}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'burndown' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ringkasan story point dan tugas per sprint (data live; grafik
              burndown harian bisa ditambahkan di fase polish).
              {payload.filterActive
                ? ' Angka tugas per sprint hanya menghitung tugas yang masuk rentang filter tanggal.'
                : null}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Sprint</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Rentang</th>
                    <th className="py-2 pr-3 font-medium tabular-nums">
                      Tugas
                    </th>
                    <th className="py-2 pr-3 font-medium tabular-nums">
                      Selesai
                    </th>
                    <th className="py-2 pr-3 font-medium tabular-nums">SP</th>
                    <th className="py-2 font-medium tabular-nums">SP selesai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payload.sprints.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Belum ada sprint.
                      </td>
                    </tr>
                  ) : (
                    payload.sprints.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 pr-3 font-medium">{s.name}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {s.status}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {s.startDate
                            ? new Date(s.startDate).toLocaleDateString('id-ID')
                            : '—'}{' '}
                          –{' '}
                          {s.endDate
                            ? new Date(s.endDate).toLocaleDateString('id-ID')
                            : '—'}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {s.totalTasks}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{s.doneTasks}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {s.totalStoryPoints}
                        </td>
                        <td className="py-2 tabular-nums">{s.doneStoryPoints}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'maintenance' && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Menurut status
              </h2>
              <BarList
                rows={payload.maintenance.byStatus.map((r) => ({
                  label: r.label,
                  count: r.count,
                }))}
                accentClass="bg-warning/80"
              />
            </div>
            <div>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Terbaru
              </h2>
              <ul className="space-y-2 text-sm">
                {payload.maintenance.recent.length === 0 ? (
                  <li className="text-muted-foreground">Tidak ada tiket.</li>
                ) : (
                  payload.maintenance.recent.map((m, i) => (
                    <li
                      key={`${m.title}-${i}`}
                      className="rounded-md border border-border px-3 py-2"
                    >
                      <p className="font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.typeLabel} · {m.statusLabel}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {tab === 'assets' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Total aset terhubung proyek:{' '}
              <strong className="text-foreground">{payload.assets.total}</strong>
            </p>
            {payload.assets.total === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada aset yang ditautkan ke proyek ini. Modul aset global
                dapat ditambahkan di phase berikutnya.
              </p>
            ) : (
              <BarList
                rows={payload.assets.byCategory.map((r) => ({
                  label: r.category,
                  count: r.count,
                }))}
                accentClass="bg-info/80"
              />
            )}
          </div>
        )}

        {tab === 'timetracking' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Total waktu tercatat pada tugas (field `timeLogged`, menit):{' '}
              <strong className="text-foreground">
                {fmtMin(payload.timeTracking.totalMinutes)}
              </strong>
              . Per anggota: dibagi rata jika banyak penerima tugas.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Anggota</th>
                    <th className="py-2 font-medium tabular-nums">Alokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payload.timeTracking.byUser.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Belum ada waktu tercatat pada tugas terfilter.
                      </td>
                    </tr>
                  ) : (
                    payload.timeTracking.byUser.map((u) => (
                      <tr key={u.userId}>
                        <td className="py-2 pr-3 font-medium">{u.name}</td>
                        <td className="py-2 tabular-nums">{fmtMin(u.minutes)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
