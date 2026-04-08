'use client';

import { Crosshair } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { SelectNative } from '@/components/ui/select-native';
import {
  ganttBuildRows,
  ganttDateRange,
  ganttIsOverdue,
  ganttPixelsPerDay,
  ganttSprintBarRange,
  ganttTaskBarRange,
  ganttVisibleTasks,
} from '@/lib/gantt-logic';
import type {
  GanttRow,
  GanttSprintFilter,
  GanttSprintRow,
  GanttTaskRow,
  GanttZoom,
} from '@/lib/gantt-types';
import { TASK_TYPE_LABEL } from '@/lib/task-labels';
import { cn } from '@/lib/utils';
import { Priority } from '@prisma/client';

const ROW_H = 40;
const HEADER_H = 48;
const LABEL_W = 260;
const DAY_MS = 86_400_000;

function atDayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function priorityBarClass(p: Priority): string {
  switch (p) {
    case 'low':
      return 'bg-info/90';
    case 'medium':
      return 'bg-primary/90';
    case 'high':
      return 'bg-warning/90';
    case 'critical':
      return 'bg-danger/90';
    default:
      return 'bg-primary/90';
  }
}

function TimelineHeaderFixed(props: {
  minTs: number;
  totalDays: number;
  dayW: number;
  zoom: GanttZoom;
  totalW: number;
}) {
  const { minTs, totalDays, dayW, zoom, totalW } = props;
  const items: {
    key: string;
    left: number;
    line1: string;
    line2?: string;
    weekend?: boolean;
  }[] = [];

  for (let i = 0; i < totalDays; i++) {
    const t = minTs + i * DAY_MS;
    const d = new Date(t);
    const dom = d.getDate();
    const dow = d.getDay();
    const left = i * dayW;

    if (zoom === 'day') {
      const line1 =
        dom === 1
          ? d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
          : String(dom);
      const line2 =
        dom === 1
          ? d.toLocaleDateString('id-ID', { year: 'numeric' })
          : undefined;
      const weekend = dow === 0 || dow === 6;
      items.push({ key: `d-${i}`, left, line1, line2, weekend });
    } else if (zoom === 'week') {
      if (dow === 1 || i === 0) {
        items.push({
          key: `w-${i}`,
          left,
          line1: d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
          }),
        });
      }
    } else if (dom === 1 || i === 0) {
      items.push({
        key: `m-${i}`,
        left,
        line1: d.toLocaleDateString('id-ID', {
          month: 'short',
          year: 'numeric',
        }),
      });
    }
  }

  return (
    <div
      className="relative shrink-0 border-b border-border bg-surface/90"
      style={{ height: HEADER_H, width: totalW }}
    >
      {items.map((tk) => (
        <span
          key={tk.key}
          className="absolute top-0 flex flex-col justify-center border-l border-border/80 pl-1 text-[10px] leading-tight"
          style={{ left: tk.left, height: HEADER_H - 1 }}
        >
          <span
            className={cn(
              'font-medium',
              tk.weekend ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {tk.line1}
          </span>
          {tk.line2 ? (
            <span className="text-[9px] text-muted-foreground">
              {tk.line2}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function RowTimeline(props: {
  row: GanttRow;
  minTs: number;
  dayW: number;
  totalW: number;
  rowIndex: number;
}) {
  const { row, minTs, dayW, totalW, rowIndex } = props;

  const gridStyle = {
    width: totalW,
    height: ROW_H,
    backgroundImage:
      'linear-gradient(to right, rgba(226, 232, 240, 0.9) 1px, transparent 1px)',
    backgroundSize: `${dayW}px 100%`,
  } as const;

  if (row.kind === 'sprint') {
    const sr = row.sprint;
    const range = sr ? ganttSprintBarRange(sr) : null;
    let barLeft = 0;
    let barWidth = 0;
    if (range) {
      const deltaDays = (range.endMs - range.startMs) / DAY_MS;
      const rawW = deltaDays * dayW;
      barWidth = Math.max(rawW, dayW);
      barLeft = ((range.startMs - minTs) / DAY_MS) * dayW;
    }

    return (
      <div
        className="relative border-b border-border bg-primary/[0.06]"
        style={gridStyle}
      >
        {range ? (
          <div
            className="pointer-events-none absolute top-1/2 h-5 -translate-y-1/2 rounded-sm bg-primary/25 ring-1 ring-primary/20"
            style={{ left: barLeft, width: barWidth, maxWidth: totalW - barLeft }}
          />
        ) : null}
      </div>
    );
  }

  const task = row.task;
  const bar = ganttTaskBarRange(task);
  const isDone = task.status === 'done';
  const isCancelled = task.status === 'cancelled';
  const overdue = ganttIsOverdue(task);

  let barLeft = 0;
  let barWidth = dayW;
  if (bar) {
    const deltaDays = (bar.endMs - bar.startMs) / DAY_MS;
    const rawW = deltaDays * dayW;
    barWidth = Math.max(rawW, dayW);
    barLeft = ((bar.startMs - minTs) / DAY_MS) * dayW;
  }

  const barClass = isDone
    ? 'bg-success/90'
    : isCancelled
      ? 'bg-muted/80'
      : overdue
        ? 'bg-danger/90'
        : priorityBarClass(task.priority);

  return (
    <div
      className={cn(
        'relative border-b border-border',
        rowIndex % 2 === 0 ? 'bg-card' : 'bg-surface/50',
      )}
      style={gridStyle}
    >
      {bar ? (
        <div
          className={cn(
            'absolute top-1/2 flex h-6 max-w-full -translate-y-1/2 items-center overflow-hidden rounded px-1.5 text-xs font-medium text-white shadow-sm',
            barClass,
          )}
          style={{
            left: Math.max(0, barLeft),
            width: Math.min(barWidth, totalW - Math.max(0, barLeft)),
          }}
          title={`${task.title}`}
        >
          <span className="truncate">{task.title}</span>
        </div>
      ) : null}
    </div>
  );
}

export function GanttClient(props: {
  projectId: string;
  tasks: GanttTaskRow[];
  sprints: GanttSprintRow[];
}) {
  const { projectId, tasks, sprints } = props;
  const [zoom, setZoom] = useState<GanttZoom>('week');
  const [sprintFilter, setSprintFilter] = useState<GanttSprintFilter>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleTasks = useMemo(
    () => ganttVisibleTasks(tasks, sprintFilter),
    [tasks, sprintFilter],
  );

  const range = useMemo(
    () => ganttDateRange(visibleTasks, sprints, sprintFilter, zoom),
    [visibleTasks, sprints, sprintFilter, zoom],
  );

  const rows = useMemo(
    () => ganttBuildRows(visibleTasks, sprints, sprintFilter),
    [visibleTasks, sprints, sprintFilter],
  );

  const minTs = atDayStart(range.min);
  const maxDayStart = atDayStart(range.max);
  const totalDays = Math.max(1, Math.round((maxDayStart - minTs) / DAY_MS) + 1);
  const dayW = ganttPixelsPerDay(zoom);
  const totalW = totalDays * dayW;
  const totalH = HEADER_H + rows.length * ROW_H;

  const todayStart = atDayStart(new Date());
  const todayLeft = ((todayStart - minTs) / DAY_MS) * dayW;

  const scrollToToday = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    el.scrollLeft = Math.max(0, todayLeft - vw / 2 + dayW);
  }, [todayLeft, dayW]);

  const ganttSprintFilterActive = sprintFilter === 'all' ? 0 : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gantt</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Linimasa tugas berdasarkan tanggal mulai dan jatuh tempo. Atur tanggal
            di{' '}
            <Link
              href={`/projects/${projectId}/backlog`}
              className="text-primary underline-offset-4 hover:underline"
            >
              backlog
            </Link>
            . Epic tidak ditampilkan di sini.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Zoom
          </span>
          <div className="flex rounded-md border border-border p-0.5">
            {(['day', 'week', 'month'] as const).map((z) => (
              <Button
                key={z}
                type="button"
                variant={zoom === z ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs capitalize"
                onClick={() => setZoom(z)}
              >
                {z === 'day' ? 'Hari' : z === 'week' ? 'Minggu' : 'Bulan'}
              </Button>
            ))}
          </div>
        </div>

        <FilterPanelSheet
          title="Filter Gantt"
          activeCount={ganttSprintFilterActive}
        >
          <FilterField label="Sprint">
            <SelectNative
              value={sprintFilter}
              onChange={(e) =>
                setSprintFilter(e.target.value as GanttSprintFilter)
              }
              className="w-full text-sm"
              aria-label="Filter sprint Gantt"
            >
              <option value="all">Semua sprint</option>
              <option value="none">Tanpa sprint</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        </FilterPanelSheet>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={scrollToToday}
        >
          <Crosshair className="h-4 w-4" />
          Hari ini
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card py-14 text-center text-sm text-muted-foreground">
          Tidak ada tugas dengan tanggal mulai atau jatuh tempo (selain epic).
          Tambahkan tanggal di backlog atau ubah filter sprint.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <div className="flex">
            <div
              className="shrink-0 border-r border-border bg-card"
              style={{ width: LABEL_W }}
            >
              <div
                className="flex items-center border-b border-border px-3 text-xs font-semibold uppercase text-muted-foreground"
                style={{ height: HEADER_H }}
              >
                Tugas / sprint
              </div>
              {rows.map((row, i) => (
                <GanttLabelRow key={rowKey(row, i)} row={row} index={i} />
              ))}
            </div>

            <div
              ref={scrollRef}
              className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
            >
              <div className="relative" style={{ width: totalW, minHeight: totalH }}>
                <TimelineHeaderFixed
                  minTs={minTs}
                  totalDays={totalDays}
                  dayW={dayW}
                  zoom={zoom}
                  totalW={totalW}
                />
                {rows.map((row, i) => (
                  <RowTimeline
                    key={rowKey(row, i)}
                    row={row}
                    minTs={minTs}
                    dayW={dayW}
                    totalW={totalW}
                    rowIndex={i}
                  />
                ))}
                <div
                  className="pointer-events-none absolute top-0 w-px bg-primary/80"
                  style={{
                    left: todayLeft,
                    height: totalH,
                    boxShadow: '0 0 0 1px rgba(37,99,235,0.2)',
                  }}
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/90" />
          Tugas (prioritas)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-danger/90" />
          Terlambat
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success/90" />
          Selesai
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-primary" />
          Hari ini
        </span>
      </div>
    </div>
  );
}

function rowKey(row: GanttRow, i: number): string {
  if (row.kind === 'sprint') {
    return `s-${row.sprint?.id ?? 'none'}-${i}`;
  }
  return `t-${row.task.id}-${i}`;
}

function GanttLabelRow(props: { row: GanttRow; index: number }) {
  const { row, index } = props;

  if (row.kind === 'sprint') {
    const s = row.sprint;
    const title = s?.name ?? 'Tanpa sprint';
    const dates =
      s?.startDate && s?.endDate
        ? `${formatShort(s.startDate)} – ${formatShort(s.endDate)}`
        : s?.startDate
          ? formatShort(s.startDate)
          : '';
    return (
      <div
        className="flex items-center gap-2 border-b border-border bg-primary/[0.06] px-3 text-sm font-semibold text-primary"
        style={{ height: ROW_H }}
      >
        <span className="truncate" title={title}>
          ⚡ {title}
        </span>
        {dates ? (
          <span className="shrink-0 text-xs font-normal text-muted-foreground">
            {dates}
          </span>
        ) : null}
      </div>
    );
  }

  const t = row.task;
  const overdue = ganttIsOverdue(t);
  const done = t.status === 'done';

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-border px-3 text-sm',
        index % 2 === 0 ? 'bg-card' : 'bg-surface/50',
        done && 'opacity-80',
        overdue && !done && 'text-danger',
      )}
      style={{ height: ROW_H }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-border text-[10px] font-semibold text-muted-foreground"
        aria-hidden
      >
        {t.assigneeInitials || '—'}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium" title={t.title}>
        {t.title}
      </span>
      <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
        {TASK_TYPE_LABEL[t.type]}
      </span>
    </div>
  );
}

function formatShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}
