'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import {
  activityActionLabel,
  activityEntityLabel,
} from '@/lib/activity-log-labels';
import type { ActivityLogRow } from '@/lib/activity-log-types';
import { cn } from '@/lib/utils';

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
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

function JsonBlock(props: { label: string; value: unknown }) {
  const { label, value } = props;
  if (value == null) return null;
  const text =
    typeof value === 'string'
      ? value
      : JSON.stringify(value, null, 2);
  if (text === '{}' || text === '[]' || text === 'null') return null;
  return (
    <details className="mt-2 rounded-md border border-border bg-surface/50 text-xs">
      <summary className="cursor-pointer px-2 py-1 font-medium text-muted-foreground">
        {label}
      </summary>
      <pre className="max-h-40 overflow-auto border-t border-border p-2 text-[11px] leading-relaxed">
        {text}
      </pre>
    </details>
  );
}

export function ActivityLogClient(props: { rows: ActivityLogRow[] }) {
  const { rows } = props;
  const [search, setSearch] = useState('');
  const [entityF, setEntityF] = useState<string>('all');
  const [actionF, setActionF] = useState<string>('all');

  const entityOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.entityType));
    return Array.from(s).sort();
  }, [rows]);

  const actionOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.action));
    return Array.from(s).sort();
  }, [rows]);

  const filterActiveCount = useMemo(() => {
    let n = 0;
    if (entityF !== 'all') n++;
    if (actionF !== 'all') n++;
    return n;
  }, [entityF, actionF]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const blob = [
        r.entityName,
        r.actorName,
        r.entityType,
        r.action,
        r.entityId,
      ]
        .join(' ')
        .toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchE = entityF === 'all' || r.entityType === entityF;
      const matchA = actionF === 'all' || r.action === actionF;
      return matchQ && matchE && matchA;
    });
  }, [rows, search, entityF, actionF]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Log aktivitas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Riwayat perubahan penting pada proyek (tugas, sprint, maintenance,
          diskusi, board). Entri baru muncul setelah fitur pencatatan aktif.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari entitas, aktor, ID…"
            className="pl-9"
            aria-label="Cari log"
          />
        </div>
        <FilterPanelSheet
          title="Filter log"
          activeCount={filterActiveCount}
        >
          <FilterField label="Jenis entitas">
            <SelectNative
              value={entityF}
              onChange={(e) => setEntityF(e.target.value)}
              className="w-full"
              aria-label="Filter jenis entitas"
            >
              <option value="all">Semua entitas</option>
              {entityOptions.map((e) => (
                <option key={e} value={e}>
                  {activityEntityLabel(e)}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Aksi">
            <SelectNative
              value={actionF}
              onChange={(e) => setActionF(e.target.value)}
              className="w-full"
              aria-label="Filter aksi"
            >
              <option value="all">Semua aksi</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {activityActionLabel(a)}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        </FilterPanelSheet>
      </div>

      <ul className="space-y-3">
        {filtered.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Tidak ada entri yang cocok.
          </li>
        ) : (
          filtered.map((r, i) => (
            <li
              key={r.id}
              className={cn(
                'rounded-lg border border-border bg-card p-4 shadow-card',
                i === 0 && 'ring-1 ring-border/80',
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary">
                    {activityEntityLabel(r.entityType)}
                  </span>
                  {' · '}
                  <span>{activityActionLabel(r.action)}</span>
                </p>
                <time
                  className="text-xs text-muted-foreground tabular-nums"
                  dateTime={r.createdAt}
                >
                  {fmtWhen(r.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-sm text-foreground">{r.entityName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Oleh {r.actorName}
                {r.actorId ? (
                  <span className="ml-1 font-mono opacity-70">
                    · {r.entityId.slice(0, 8)}…
                  </span>
                ) : null}
              </p>
              <JsonBlock label="Perubahan (changes)" value={r.changes} />
              <JsonBlock label="Metadata" value={r.metadata} />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
