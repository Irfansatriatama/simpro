'use client';

import { CalendarPlus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

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
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, proyek, pembuat…"
            className="pl-9"
            aria-label="Cari meeting"
          />
        </div>
        <SelectNative
          value={typeF}
          onChange={(e) => setTypeF(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">Semua tipe</option>
          {MEETING_TYPES.map((t) => (
            <option key={t} value={t}>
              {MEETING_TYPE_LABEL[t]}
            </option>
          ))}
        </SelectNative>
        <SelectNative
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">Semua status</option>
          {MEETING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MEETING_STATUS_LABEL[s]}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Judul</th>
              <th className="px-3 py-2 font-medium">Waktu</th>
              <th className="px-3 py-2 font-medium">Tipe</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Proyek</th>
              <th className="px-3 py-2 font-medium">Dibuat oleh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  Tidak ada meeting yang cocok.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface/40">
                  <td className="px-3 py-2">
                    <Link
                      href={`/meetings/${r.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.title}
                    </Link>
                    {r.location ? (
                      <p className="text-xs text-muted-foreground">
                        {r.location}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {fmtWhen(r.date)}
                  </td>
                  <td className="px-3 py-2">
                    {MEETING_TYPE_LABEL[r.type as keyof typeof MEETING_TYPE_LABEL] ??
                      r.type}
                  </td>
                  <td className="px-3 py-2">
                    {MEETING_STATUS_LABEL[
                      r.status as keyof typeof MEETING_STATUS_LABEL
                    ] ?? r.status}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-xs text-muted-foreground">
                    {r.projectCodes || '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.creatorName}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
