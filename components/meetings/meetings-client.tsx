'use client';

import { CalendarPlus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import {
  MEETING_STATUSES,
  MEETING_STATUS_LABEL,
  MEETING_TYPES,
  MEETING_TYPE_LABEL,
} from '@/lib/meeting-constants';
import type {
  MeetingListRow,
  MeetingProjectPick,
  MeetingUserPick,
} from '@/lib/meeting-types';

import { MeetingFormDialog } from './meeting-form-dialog';

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

export function MeetingsClient(props: {
  rows: MeetingListRow[];
  projects: MeetingProjectPick[];
  users: MeetingUserPick[];
}) {
  const { rows, projects, users } = props;
  const [search, setSearch] = useState('');
  const [typeF, setTypeF] = useState<string>('all');
  const [statusF, setStatusF] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  const filterActiveCount = useMemo(() => {
    let n = 0;
    if (typeF !== 'all') n++;
    if (statusF !== 'all') n++;
    return n;
  }, [typeF, statusF]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const blob = [r.title, r.projectCodes, r.creatorName, r.location ?? '']
        .join(' ')
        .toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchT = typeF === 'all' || r.type === typeF;
      const matchS = statusF === 'all' || r.status === statusF;
      return matchQ && matchT && matchS;
    });
  }, [rows, search, typeF, statusF]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Meetings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jadwal dan notulensi lintas proyek. Hanya administrator dan PM.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setFormOpen(true)}
          className="gap-2"
        >
          <CalendarPlus className="h-4 w-4" />
          Meeting baru
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, proyek, pembuat…"
            className="pl-9"
            aria-label="Cari meeting"
          />
        </div>
        <FilterPanelSheet
          title="Filter meeting"
          activeCount={filterActiveCount}
        >
          <FilterField label="Tipe">
            <SelectNative
              value={typeF}
              onChange={(e) => setTypeF(e.target.value)}
              className="w-full"
            >
              <option value="all">Semua tipe</option>
              {MEETING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MEETING_TYPE_LABEL[t]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Status">
            <SelectNative
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
              className="w-full"
            >
              <option value="all">Semua status</option>
              {MEETING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {MEETING_STATUS_LABEL[s]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        </FilterPanelSheet>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
            Tidak ada meeting yang cocok.
          </p>
        ) : (
          filtered.map((r) => (
            <Link
              key={r.id}
              href={`/meetings/${r.id}`}
              className="group flex flex-col rounded-lg border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-foreground group-hover:text-primary">
                  {r.title}
                </h2>
                <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-xs text-muted-foreground">
                  {MEETING_STATUS_LABEL[
                    r.status as keyof typeof MEETING_STATUS_LABEL
                  ] ?? r.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {MEETING_TYPE_LABEL[
                  r.type as keyof typeof MEETING_TYPE_LABEL
                ] ?? r.type}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {fmtWhen(r.date)}
              </p>
              {r.location ? (
                <p className="mt-1 text-sm text-foreground">{r.location}</p>
              ) : null}
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {r.projectCodes || 'Tanpa proyek terhubung'}
              </p>
              <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                {r.creatorName}
              </p>
            </Link>
          ))
        )}
      </div>

      <MeetingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="create"
        meeting={null}
        projects={projects}
        users={users}
      />
    </div>
  );
}
