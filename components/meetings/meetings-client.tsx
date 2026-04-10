'use client';

import {
  Calendar,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Columns,
  Eye,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MEETING_TYPE_COLOR,
  meetingStatusLabel,
  meetingTypeLabel,
  normalizeMeetingStatus,
  type MeetingTypeValue,
} from '@/lib/meeting-constants';
import { formatMeetingDayTitle, meetingDateKeyFromIso } from '@/lib/meeting-date';
import type {
  MeetingListRow,
  MeetingProjectPick,
  MeetingUserPick,
} from '@/lib/meeting-types';

import { MeetingFormDialog } from './meeting-form-dialog';

function todayKey(): string {
  return meetingDateKeyFromIso(new Date().toISOString());
}

function monthMatrix(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  return { startPad, daysInMonth };
}

function weekRangeKeys(centerKey: string): string[] {
  const [y, m, d] = centerKey.split('-').map(Number);
  const center = new Date(y, m - 1, d);
  const dow = center.getDay();
  const start = new Date(center);
  start.setDate(center.getDate() - dow);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    keys.push(meetingDateKeyFromIso(x.toISOString()));
  }
  return keys;
}

export function MeetingsClient(props: {
  rows: MeetingListRow[];
  projects: MeetingProjectPick[];
  users: MeetingUserPick[];
  canManage: boolean;
}) {
  const { rows, projects, users, canManage } = props;
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [calMonth, setCalMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editMeetingId, setEditMeetingId] = useState<string | null>(null);

  const year = calMonth.getFullYear();
  const month0 = calMonth.getMonth();
  const { startPad, daysInMonth } = monthMatrix(year, month0);

  const meetingCountByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      m.set(r.dateKey, (m.get(r.dateKey) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  const dayMeetings = useMemo(() => {
    return rows
      .filter((r) => r.dateKey === selectedDate)
      .sort((a, b) =>
        (a.startTime || '').localeCompare(b.startTime || '', undefined, {
          numeric: true,
        }),
      );
  }, [rows, selectedDate]);

  const weekKeys = useMemo(
    () => weekRangeKeys(selectedDate),
    [selectedDate],
  );

  const goPrev = useCallback(() => {
    if (viewMode === 'month') {
      setCalMonth(new Date(year, month0 - 1, 1));
    } else {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() - 7);
      setSelectedDate(meetingDateKeyFromIso(dt.toISOString()));
    }
  }, [viewMode, year, month0, selectedDate]);

  const goNext = useCallback(() => {
    if (viewMode === 'month') {
      setCalMonth(new Date(year, month0 + 1, 1));
    } else {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + 7);
      setSelectedDate(meetingDateKeyFromIso(dt.toISOString()));
    }
  }, [viewMode, year, month0, selectedDate]);

  const monthLabel = calMonth.toLocaleString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const weekLabel = useMemo(() => {
    const a = new Date(weekKeys[0] + 'T12:00:00');
    const b = new Date(weekKeys[6] + 'T12:00:00');
    const fa = a.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
    const fb = b.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${fa} – ${fb}`;
  }, [weekKeys]);

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Calendar className="h-7 w-7 text-primary" aria-hidden />
            Meetings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jadwalkan, kelola, dan dokumentasikan meeting tim — seperti di Trackly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-border bg-card p-0.5"
            role="group"
            aria-label="Tampilan kalender"
          >
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              className="gap-1.5"
              onClick={() => setViewMode('month')}
              aria-pressed={viewMode === 'month'}
            >
              <Calendar className="h-4 w-4" />
              Bulan
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              className="gap-1.5"
              onClick={() => setViewMode('week')}
              aria-pressed={viewMode === 'week'}
            >
              <Columns className="h-4 w-4" />
              Minggu
            </Button>
          </div>
          {canManage ? (
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                setEditMeetingId(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Meeting baru
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full shrink-0 rounded-xl border border-border bg-card shadow-card lg:max-w-sm">
          <div className="p-4">
            {viewMode === 'month' ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Bulan sebelumnya"
                    onClick={goPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium capitalize">
                    {monthLabel}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Bulan berikutnya"
                    onClick={goNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-muted-foreground">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(
                    (d) => (
                      <div key={d} className="py-1">
                        {d}
                      </div>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startPad }).map((_, i) => (
                    <div key={`e-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSel = dateStr === selectedDate;
                    const isToday = dateStr === todayKey();
                    const has = (meetingCountByDay.get(dateStr) ?? 0) > 0;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setSelectedDate(dateStr)}
                        className={cn(
                          'relative flex aspect-square items-center justify-center rounded-lg text-sm transition-colors',
                          isSel &&
                            'bg-primary font-semibold text-primary-foreground',
                          !isSel && isToday && 'ring-2 ring-primary/40',
                          !isSel &&
                            !isToday &&
                            'hover:bg-muted/80 text-foreground',
                          has &&
                            !isSel &&
                            'after:absolute after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-primary',
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Minggu sebelumnya"
                    onClick={goPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-1 text-center text-xs font-medium text-muted-foreground sm:text-sm">
                    {weekLabel}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Minggu berikutnya"
                    onClick={goNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekKeys.map((k) => {
                    const [y, m, d] = k.split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    const isSel = k === selectedDate;
                    const isToday = k === todayKey();
                    const cnt = meetingCountByDay.get(k) ?? 0;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedDate(k)}
                        className={cn(
                          'flex flex-col items-center gap-0.5 rounded-lg border border-transparent px-1 py-2 text-center text-xs transition-colors',
                          isSel && 'border-primary bg-primary/10',
                          !isSel && isToday && 'ring-2 ring-primary/30',
                          !isSel && !isToday && 'hover:bg-muted/60',
                        )}
                      >
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {dt.toLocaleDateString('id-ID', { weekday: 'short' })}
                        </span>
                        <span className="text-base font-semibold">{d}</span>
                        {cnt > 0 ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {formatMeetingDayTitle(selectedDate)}
            </h2>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {dayMeetings.length} meeting
              {dayMeetings.length !== 1 ? '' : ''}
            </span>
          </div>

          {dayMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
              <CalendarOff
                className="mb-3 h-10 w-10 text-muted-foreground"
                aria-hidden
              />
              <p className="font-medium text-foreground">
                Tidak ada meeting di hari ini
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {canManage
                  ? 'Klik «Meeting baru» untuk menjadwalkan.'
                  : 'Anda hanya melihat meeting yang Anda buat atau diundang.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {dayMeetings.map((m) => (
                <li key={m.id}>
                  <MeetingDayCard
                    row={m}
                    canManage={canManage}
                    onEdit={() => {
                      setEditMeetingId(m.id);
                      setFormOpen(true);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <MeetingFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditMeetingId(null);
        }}
        editMeetingId={editMeetingId}
        defaultDateKey={selectedDate}
        projects={projects}
        users={users}
      />
    </div>
  );
}

function MeetingDayCard(props: {
  row: MeetingListRow;
  canManage: boolean;
  onEdit: () => void;
}) {
  const { row, canManage, onEdit } = props;
  const typeKey = (MEETING_TYPE_COLOR[row.type as MeetingTypeValue]
    ? row.type
    : 'other') as MeetingTypeValue;
  const bar = MEETING_TYPE_COLOR[typeKey] ?? '#64748B';
  const st = normalizeMeetingStatus(row.status);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: bar }}
        aria-hidden
      />
      <div className="p-4 pl-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={`/meetings/${row.id}`}
              className="text-lg font-semibold text-foreground hover:text-primary"
            >
              {row.title}
            </Link>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                {row.startTime || '—'} – {row.endTime || '—'}
              </span>
              {row.location ? (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {row.location}
                </span>
              ) : null}
            </div>
            {row.projectCodes ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {row.projectCodes.split(',').map((c) => (
                  <span
                    key={c}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {c.trim()}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
              {meetingTypeLabel(row.type)}
            </span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {meetingStatusLabel(row.status)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {row.attendeePreview.slice(0, 4).map((u) => (
                <div
                  key={u.id}
                  className="relative z-0 h-8 w-8 overflow-hidden rounded-full border-2 border-card bg-muted text-[10px] font-semibold"
                  title={u.name}
                >
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-primary">
                      {u.name
                        .split(/\s+/)
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {row.attendeeCount > 4 ? (
                <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
                  +{row.attendeeCount - 4}
                </div>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {row.attendeeCount} peserta
            </span>
            {row.agendaTotal > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                {row.agendaDone}/{row.agendaTotal} agenda
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <Link href={`/meetings/${row.id}`}>
                <Eye className="h-3.5 w-3.5" />
                Lihat
              </Link>
            </Button>
            {canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                aria-label="Edit meeting"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
