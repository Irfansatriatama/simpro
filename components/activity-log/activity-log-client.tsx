'use client';

import {
  Activity,
  CheckCircle,
  ChevronDown,
  Edit2,
  MessageCircle,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import type { ActivityLogRow } from '@/lib/activity-log-types';
import {
  activityActionLabel as actionLbl,
  activityEntityLabel as entityLbl,
} from '@/lib/activity-log-labels';
import { cn } from '@/lib/utils';

const INITIAL_VISIBLE = 5;
const LOAD_MORE_STEP = 10;

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

function formatRelativeId(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Baru saja';
  if (sec < 3600) return `${Math.floor(sec / 60)} menit lalu`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} jam lalu`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} hari lalu`;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toTitleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

type NormalizedChange = {
  field: string;
  oldVal: unknown;
  newVal: unknown;
};

function normalizeChanges(raw: unknown): NormalizedChange[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalizedChange[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const field = String(o.field ?? o.Field ?? '');
    const oldVal = o.old_value ?? o.oldValue ?? o.before;
    const newVal = o.new_value ?? o.newValue ?? o.after;
    out.push({ field: field || '—', oldVal, newVal });
  }
  return out;
}

function renderDiffCell(v: unknown): React.ReactNode {
  if (v === null || v === undefined || v === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  if (Array.isArray(v)) {
    return String(v.join(', '));
  }
  if (typeof v === 'object') {
    return (
      <pre className="max-w-[200px] overflow-auto whitespace-pre-wrap text-[11px]">
        {JSON.stringify(v)}
      </pre>
    );
  }
  return String(v);
}

const ACTION_COLORS: Record<string, string> = {
  created: '#16a34a',
  updated: '#2563eb',
  deleted: '#dc2626',
  status_changed: '#d97706',
  assigned: '#0891b2',
  unassigned: '#7c3aed',
  commented: '#2563eb',
  uploaded: '#0891b2',
  sprint_started: '#16a34a',
  sprint_completed: '#16a34a',
  member_added: '#0891b2',
  member_removed: '#dc2626',
  board_moved: '#7c3aed',
};

function ActionIcon({ action }: { action: string }) {
  const cls = 'h-3 w-3 text-white';
  switch (action) {
    case 'created':
      return <PlusCircle className={cls} aria-hidden />;
    case 'updated':
      return <Edit2 className={cls} aria-hidden />;
    case 'deleted':
      return <Trash2 className={cls} aria-hidden />;
    case 'status_changed':
      return <RefreshCw className={cls} aria-hidden />;
    case 'assigned':
    case 'member_added':
      return <UserCheck className={cls} aria-hidden />;
    case 'unassigned':
    case 'member_removed':
      return <UserMinus className={cls} aria-hidden />;
    case 'commented':
      return <MessageCircle className={cls} aria-hidden />;
    case 'uploaded':
      return <Upload className={cls} aria-hidden />;
    case 'sprint_started':
      return <PlayCircle className={cls} aria-hidden />;
    case 'sprint_completed':
      return <CheckCircle className={cls} aria-hidden />;
    default:
      return <Activity className={cls} aria-hidden />;
  }
}

function LogActionLine({ row }: { row: ActivityLogRow }) {
  const actor = row.actorName || 'Seseorang';
  const entity = row.entityName || row.entityId || '—';
  const etLabel = entityLbl(row.entityType);

  const parts: Record<string, React.ReactNode> = {
    created: (
      <>
        <strong>{actor}</strong> membuat {etLabel}{' '}
        <strong>{entity}</strong>
      </>
    ),
    updated: (
      <>
        <strong>{actor}</strong> memperbarui {etLabel}{' '}
        <strong>{entity}</strong>
      </>
    ),
    deleted: (
      <>
        <strong>{actor}</strong> menghapus {etLabel}{' '}
        <strong>{entity}</strong>
      </>
    ),
    status_changed: (
      <>
        <strong>{actor}</strong> mengubah status {etLabel}{' '}
        <strong>{entity}</strong>
      </>
    ),
    assigned: (
      <>
        <strong>{actor}</strong> menetapkan {etLabel}{' '}
        <strong>{entity}</strong>
      </>
    ),
    unassigned: (
      <>
        <strong>{actor}</strong> mencabut penugasan {etLabel}{' '}
        <strong>{entity}</strong>
      </>
    ),
    commented: (
      <>
        <strong>{actor}</strong> berkomentar pada {etLabel}{' '}
        <strong>{entity}</strong>
      </>
    ),
    uploaded: (
      <>
        <strong>{actor}</strong> mengunggah berkas ke {etLabel}{' '}
        <strong>{entity}</strong>
      </>
    ),
    sprint_started: (
      <>
        <strong>{actor}</strong> memulai sprint <strong>{entity}</strong>
      </>
    ),
    sprint_completed: (
      <>
        <strong>{actor}</strong> menyelesaikan sprint <strong>{entity}</strong>
      </>
    ),
    member_added: (
      <>
        <strong>{actor}</strong> menambah anggota pada <strong>{entity}</strong>
      </>
    ),
    member_removed: (
      <>
        <strong>{actor}</strong> menghapus anggota dari{' '}
        <strong>{entity}</strong>
      </>
    ),
    board_moved: (
      <>
        <strong>{actor}</strong> memindahkan {etLabel}{' '}
        <strong>{entity}</strong> di board
      </>
    ),
  };

  return (
    <p className="text-sm leading-snug text-foreground">
      {parts[row.action] ?? (
        <>
          <strong>{actor}</strong> melakukan{' '}
          <em>{actionLbl(row.action)}</em> pada {etLabel}{' '}
          <strong>{entity}</strong>
        </>
      )}
    </p>
  );
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join('') || '?';
}

export function ActivityLogClient(props: {
  rows: ActivityLogRow[];
  projectName?: string | null;
}) {
  const { rows, projectName } = props;
  const [search, setSearch] = useState('');
  const [entityF, setEntityF] = useState('');
  const [actorF, setActorF] = useState('');
  const [actionF, setActionF] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const entityOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.entityType));
    return Array.from(s).sort();
  }, [rows]);

  const actionOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.action));
    return Array.from(s).sort();
  }, [rows]);

  const actorOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      if (r.actorId) m.set(r.actorId, r.actorName || r.actorId);
    }
    return Array.from(m.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], 'id'),
    );
  }, [rows]);

  const filterModalCount = useMemo(() => {
    let n = 0;
    if (entityF) n++;
    if (actorF) n++;
    if (actionF) n++;
    if (dateFrom) n++;
    if (dateTo) n++;
    return n;
  }, [entityF, actorF, actionF, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (entityF && r.entityType !== entityF) return false;
      if (actorF && r.actorId !== actorF) return false;
      if (actionF && r.action !== actionF) return false;
      if (dateFrom) {
        const logDate = r.createdAt.slice(0, 10);
        if (!logDate || logDate < dateFrom) return false;
      }
      if (dateTo) {
        const logDate = r.createdAt.slice(0, 10);
        if (!logDate || logDate > dateTo) return false;
      }
      if (q) {
        const blob = [
          r.actorName,
          r.entityName,
          r.action,
          r.entityType,
          r.entityId,
        ]
          .join(' ')
          .toLowerCase()
          .replace(/_/g, ' ');
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, entityF, actorF, actionF, dateFrom, dateTo]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visibleCount;

  function clearFilterKey(
    key: 'entity' | 'actor' | 'action' | 'dateFrom' | 'dateTo',
  ) {
    setVisibleCount(INITIAL_VISIBLE);
    if (key === 'entity') setEntityF('');
    if (key === 'actor') setActorF('');
    if (key === 'action') setActionF('');
    if (key === 'dateFrom') setDateFrom('');
    if (key === 'dateTo') setDateTo('');
  }

  function resetAllFilters() {
    setEntityF('');
    setActorF('');
    setActionF('');
    setDateFrom('');
    setDateTo('');
    setVisibleCount(INITIAL_VISIBLE);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-foreground">
          <Activity className="h-7 w-7 text-muted-foreground" aria-hidden />
          Log aktivitas
          {projectName ? (
            <span className="text-lg font-normal text-muted-foreground">
              — {projectName}
            </span>
          ) : null}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Riwayat lengkap tindakan pada proyek ini (tugas, sprint, board,
          diskusi, dan lainnya).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(INITIAL_VISIBLE);
            }}
            placeholder="Cari aktor, entitas, atau aksi…"
            className="pl-9"
            aria-label="Cari log"
          />
        </div>
        <div className="relative shrink-0">
          <FilterPanelSheet
            title="Filter log"
            activeCount={filterModalCount}
            triggerClassName="gap-2"
          >
            <FilterField label="Jenis entitas">
              <SelectNative
                value={entityF}
                onChange={(e) => {
                  setEntityF(e.target.value);
                  setVisibleCount(INITIAL_VISIBLE);
                }}
                aria-label="Jenis entitas"
              >
                <option value="">Semua jenis</option>
                {entityOptions.map((e) => (
                  <option key={e} value={e}>
                    {entityLbl(e)}
                  </option>
                ))}
              </SelectNative>
            </FilterField>
            <FilterField label="Aktor">
              <SelectNative
                value={actorF}
                onChange={(e) => {
                  setActorF(e.target.value);
                  setVisibleCount(INITIAL_VISIBLE);
                }}
                aria-label="Aktor"
              >
                <option value="">Semua pengguna</option>
                {actorOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </SelectNative>
            </FilterField>
            <FilterField label="Aksi">
              <SelectNative
                value={actionF}
                onChange={(e) => {
                  setActionF(e.target.value);
                  setVisibleCount(INITIAL_VISIBLE);
                }}
                aria-label="Aksi"
              >
                <option value="">Semua aksi</option>
                {actionOptions.map((a) => (
                  <option key={a} value={a}>
                    {actionLbl(a)}
                  </option>
                ))}
              </SelectNative>
            </FilterField>
            <div className="space-y-2">
              <Label htmlFor="logDateFrom" className="text-xs">
                Dari tanggal
              </Label>
              <Input
                id="logDateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setVisibleCount(INITIAL_VISIBLE);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logDateTo" className="text-xs">
                Sampai tanggal
              </Label>
              <Input
                id="logDateTo"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setVisibleCount(INITIAL_VISIBLE);
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={resetAllFilters}
            >
              Reset filter
            </Button>
          </FilterPanelSheet>
        </div>
      </div>

      {(entityF || actorF || actionF || dateFrom || dateTo) && (
        <div className="flex flex-wrap gap-2">
          {entityF ? (
            <FilterChip
              label={`Entitas: ${entityLbl(entityF)}`}
              onRemove={() => clearFilterKey('entity')}
            />
          ) : null}
          {actorF ? (
            <FilterChip
              label={`Aktor: ${actorOptions.find(([id]) => id === actorF)?.[1] ?? actorF}`}
              onRemove={() => clearFilterKey('actor')}
            />
          ) : null}
          {actionF ? (
            <FilterChip
              label={`Aksi: ${actionLbl(actionF)}`}
              onRemove={() => clearFilterKey('action')}
            />
          ) : null}
          {dateFrom ? (
            <FilterChip
              label={`Dari: ${dateFrom}`}
              onRemove={() => clearFilterKey('dateFrom')}
            />
          ) : null}
          {dateTo ? (
            <FilterChip
              label={`Sampai: ${dateTo}`}
              onRemove={() => clearFilterKey('dateTo')}
            />
          ) : null}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Activity
              className="mx-auto h-10 w-10 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-3 font-medium text-foreground">
              Tidak ada aktivitas
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search.trim()
                ? 'Tidak ada hasil yang cocok dengan pencarian Anda.'
                : 'Tindakan pada proyek ini akan muncul di sini.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4" aria-hidden />
                {filtered.length}{' '}
                {filtered.length === 1 ? 'entri' : 'entri'}
              </span>
              <span className="text-xs text-muted-foreground">
                Menampilkan {Math.min(visibleCount, filtered.length)} dari{' '}
                {filtered.length}
              </span>
            </div>
            <ul className="relative pl-2">
              {visible.map((row, idx) => (
                <LogTimelineEntry
                  key={row.id}
                  row={row}
                  isFirst={idx === 0}
                />
              ))}
            </ul>
            {remaining > 0 ? (
              <div className="border-t border-border p-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full px-5"
                  onClick={() =>
                    setVisibleCount((c) => c + LOAD_MORE_STEP)
                  }
                >
                  <ChevronDown className="mr-1.5 h-4 w-4" aria-hidden />
                  Muat {Math.min(remaining, LOAD_MORE_STEP)} lainnya
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 py-1 pl-2.5 pr-1 text-xs">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-border/80"
        aria-label="Hapus filter"
      >
        ×
      </button>
    </span>
  );
}

function LogTimelineEntry({
  row,
  isFirst,
}: {
  row: ActivityLogRow;
  isFirst: boolean;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const changes = normalizeChanges(row.changes);
  const hasChanges = changes.length > 0;
  const dotColor = ACTION_COLORS[row.action] ?? 'var(--muted-foreground)';
  const meta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null;

  return (
    <li
      className={cn(
        'relative flex gap-3 border-b border-border/60 py-4 pl-8 pr-4 last:border-b-0 sm:pl-10 sm:pr-5',
        isFirst && 'bg-primary/[0.03]',
      )}
    >
      <div
        className="absolute left-2 top-5 flex h-6 w-6 items-center justify-center rounded-full sm:left-3"
        style={{ backgroundColor: dotColor }}
      >
        <ActionIcon action={row.action} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary text-xs font-semibold text-primary-foreground">
            {initialsFromName(row.actorName || '?')}
          </div>
          <div className="min-w-0 flex-1">
            <LogActionLine row={row} />
            <time
              className="mt-1 block text-xs text-muted-foreground"
              dateTime={row.createdAt}
              title={fmtWhen(row.createdAt)}
            >
              {formatRelativeId(row.createdAt)}
            </time>
          </div>
        </div>

        {hasChanges ? (
          <div className="mt-3 pl-12 sm:pl-12">
            <button
              type="button"
              onClick={() => setShowDiff((s) => !s)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {showDiff ? 'Sembunyikan perubahan' : 'Tampilkan perubahan'}
            </button>
            {showDiff ? (
              <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[320px] text-left text-xs">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Bidang</th>
                      <th className="px-2 py-1.5 font-medium">Sebelum</th>
                      <th className="px-2 py-1.5 font-medium">Sesudah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {changes.map((c, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5 align-top font-medium">
                          {toTitleCase(c.field)}
                        </td>
                        <td className="max-w-[180px] px-2 py-1.5 align-top text-muted-foreground">
                          {renderDiffCell(c.oldVal)}
                        </td>
                        <td className="max-w-[180px] px-2 py-1.5 align-top">
                          {renderDiffCell(c.newVal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        {meta && Object.keys(meta).length > 0 ? (
          <p className="mt-2 pl-12 text-xs text-muted-foreground sm:pl-12">
            {Object.entries(meta).map(([k, v], i) => (
              <span key={k}>
                {i > 0 ? ' · ' : null}
                <span className="font-medium text-foreground/80">
                  {toTitleCase(k)}
                </span>
                : {String(v)}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </li>
  );
}
