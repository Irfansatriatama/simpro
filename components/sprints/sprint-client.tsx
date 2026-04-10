'use client';

import {
  BarChart2,
  LayoutGrid,
  List,
  Plus,
  Search,
  TrendingDown,
  Zap,
  ListTree,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  deleteSprintAction,
  updateSprintRetroAction,
} from '@/app/actions/sprints';
import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import type { ProjectBoardColumn } from '@/lib/project-board-columns';
import type { SprintTaskRef } from '@/lib/sprint-planning-types';
import type { SprintRow } from '@/lib/sprint-types';
import {
  SPRINT_STATUSES,
  SPRINT_STATUS_LABEL,
} from '@/lib/sprint-constants';
import { cn } from '@/lib/utils';

import { SprintBoardMini } from './sprint-board-mini';
import { SprintBurndownCanvas } from './sprint-burndown-canvas';
import { SprintFormDialog } from './sprint-form-dialog';
import { SprintPlanningView } from './sprint-planning-view';
import { SprintStatusBadge } from './sprint-status-badge';
import {
  SprintVelocityCanvas,
  type VelocityBar,
} from './sprint-velocity-canvas';

type StatusFilter = 'all' | (typeof SPRINT_STATUSES)[number];
type SprintTab = 'list' | 'planning' | 'board' | 'burndown' | 'velocity';

function formatRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Dari ${fmt(start)}`;
  return `Sampai ${fmt(end!)}`;
}

function DeleteSprintButton(props: {
  projectId: string;
  sprint: SprintRow;
}) {
  const { projectId, sprint } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        const n = sprint.taskCount;
        const msg =
          n > 0
            ? `Hapus sprint "${sprint.name}"? ${n} tugas akan dilepas dari sprint (tetap di proyek).`
            : `Hapus sprint "${sprint.name}"?`;
        if (!window.confirm(msg)) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set('projectId', projectId);
          fd.set('sprintId', sprint.id);
          const r = await deleteSprintAction(fd);
          if (!r.ok) {
            window.alert(r.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      Hapus
    </Button>
  );
}

const TAB_ITEMS: {
  id: SprintTab;
  label: string;
  icon: typeof List;
}[] = [
  { id: 'list', label: 'Daftar sprint', icon: List },
  { id: 'planning', label: 'Perencanaan', icon: ListTree },
  { id: 'board', label: 'Board sprint', icon: LayoutGrid },
  { id: 'burndown', label: 'Burndown', icon: TrendingDown },
  { id: 'velocity', label: 'Velocity', icon: BarChart2 },
];

export function SprintClient(props: {
  projectId: string;
  projectName: string;
  boardLayout: ProjectBoardColumn[];
  sprints: SprintRow[];
  tasks: SprintTaskRef[];
  canEdit: boolean;
}) {
  const { projectId, projectName, boardLayout, sprints, tasks, canEdit } =
    props;
  const router = useRouter();
  const [tab, setTab] = useState<SprintTab>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<SprintRow | null>(null);

  const defaultPlanningId = useMemo(() => {
    const a = sprints.find((s) => s.status === 'active');
    if (a) return a.id;
    const p = sprints.find((s) => s.status === 'planning');
    return p?.id ?? sprints[0]?.id ?? '';
  }, [sprints]);

  const [planningSprintId, setPlanningSprintId] = useState('');
  const effectivePlanningId = planningSprintId || defaultPlanningId;

  useEffect(() => {
    if (!planningSprintId && defaultPlanningId) {
      setPlanningSprintId(defaultPlanningId);
    }
  }, [defaultPlanningId, planningSprintId]);

  const activeSprint = useMemo(
    () => sprints.find((s) => s.status === 'active'),
    [sprints],
  );

  const burndownSprint = useMemo(() => {
    return (
      sprints.find((s) => s.status === 'active') ??
      sprints.find((s) => s.status === 'completed')
    );
  }, [sprints]);

  const burndownStats = useMemo(() => {
    if (!burndownSprint) return null;
    const st = tasks.filter((t) => t.sprintId === burndownSprint.id);
    const totalSP = st.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
    const doneSP = st
      .filter((t) => t.status === 'done')
      .reduce((s, t) => s + (t.storyPoints ?? 0), 0);
    return { totalSP, doneSP, remainSP: totalSP - doneSP, st };
  }, [burndownSprint, tasks]);

  const velocityBars: VelocityBar[] = useMemo(() => {
    const list = sprints
      .filter((s) => s.status !== 'planning')
      .slice(-8);
    return list.map((sp) => {
      const st = tasks.filter((t) => t.sprintId === sp.id);
      const committed = st.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
      const completed = st
        .filter((t) => t.status === 'done')
        .reduce((s, t) => s + (t.storyPoints ?? 0), 0);
      return { name: sp.name, committed, completed };
    });
  }, [sprints, tasks]);

  const lastSprintId = sprints[sprints.length - 1]?.id ?? '';
  const [retroSprintId, setRetroSprintId] = useState('');
  const effectiveRetroId = retroSprintId || lastSprintId;
  const retroSprint = sprints.find((s) => s.id === effectiveRetroId);
  const [retroDraft, setRetroDraft] = useState(retroSprint?.retro ?? '');
  const [retroPending, startRetro] = useTransition();

  useEffect(() => {
    setRetroDraft(retroSprint?.retro ?? '');
  }, [retroSprint?.id, retroSprint?.retro]);

  const filterActiveCount = statusFilter === 'all' ? 0 : 1;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sprints.filter((s) => {
      const blob = [s.name, s.goal ?? '', s.retro ?? '']
        .join(' ')
        .toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchStatus =
        statusFilter === 'all' || s.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [sprints, search, statusFilter]);

  const activeSprintTasks = useMemo(() => {
    if (!activeSprint) return [];
    return tasks.filter((t) => t.sprintId === activeSprint.id);
  }, [activeSprint, tasks]);
  const activeDone = activeSprintTasks.filter((t) => t.status === 'done').length;
  const activeTotal = activeSprintTasks.length;
  const activePct =
    activeTotal > 0 ? Math.round((activeDone / activeTotal) * 100) : 0;

  const daysLeftActive = useMemo(() => {
    if (!activeSprint?.endDate) return null;
    const end = new Date(activeSprint.endDate + 'T23:59:59');
    const diff = end.getTime() - Date.now();
    return Math.ceil(diff / 86_400_000);
  }, [activeSprint?.endDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Sprint
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projectName} — {sprints.length} sprint. Tugas ditautkan dari{' '}
            <Link
              href={`/projects/${projectId}/backlog`}
              className="text-primary underline-offset-4 hover:underline"
            >
              backlog
            </Link>
            .
          </p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            onClick={() => {
              setFormMode('create');
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Sprint baru
          </Button>
        ) : null}
      </div>

      {activeSprint ? (
        <div className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <Zap className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sprint aktif
            </p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">
              {activeSprint.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {activeSprint.endDate ? (
                <span>
                  Berakhir{' '}
                  {formatRange(null, activeSprint.endDate)}
                  {daysLeftActive != null
                    ? daysLeftActive > 0
                      ? ` (${daysLeftActive} hari lagi)`
                      : daysLeftActive === 0
                        ? ' (hari ini)'
                        : ` (${Math.abs(daysLeftActive)} hari lewat)`
                    : ''}
                </span>
              ) : (
                <span>Tanggal akhir belum diatur</span>
              )}
              <span className="tabular-nums">
                Progres tugas: {activeDone}/{activeTotal} ({activePct}%)
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border/80">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${activePct}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="flex gap-1 overflow-x-auto border-b border-border pb-px"
        role="tablist"
        aria-label="Bagian sprint"
      >
        {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'list' ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-0 flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau goal…"
                  className="pl-9"
                  aria-label="Cari sprint"
                />
              </div>
              <FilterPanelSheet
                title="Filter sprint"
                activeCount={filterActiveCount}
              >
                <FilterField label="Status sprint">
                  <SelectNative
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as StatusFilter)
                    }
                    className="w-full"
                    aria-label="Filter status sprint"
                  >
                    <option value="all">Semua status</option>
                    {SPRINT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {SPRINT_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </SelectNative>
                </FilterField>
              </FilterPanelSheet>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nama</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Rentang</th>
                    <th className="px-3 py-2 font-medium tabular-nums">
                      Tugas
                    </th>
                    {canEdit ? (
                      <th className="px-3 py-2 text-right font-medium">
                        Aksi
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canEdit ? 5 : 4}
                        className="px-3 py-10 text-center text-muted-foreground"
                      >
                        Tidak ada sprint yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-surface/40">
                        <td className="max-w-[280px] px-3 py-2">
                          <p className="font-medium text-foreground">
                            {s.name}
                          </p>
                          {s.goal ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {s.goal}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <SprintStatusBadge status={s.status} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {formatRange(s.startDate, s.endDate)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {s.taskCount}
                        </td>
                        {canEdit ? (
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setFormMode('edit');
                                  setEditing(s);
                                  setFormOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <DeleteSprintButton
                                projectId={projectId}
                                sprint={s}
                              />
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {tab === 'planning' ? (
          <SprintPlanningView
            projectId={projectId}
            sprints={sprints}
            tasks={tasks}
            planningSprintId={effectivePlanningId}
            onPlanningSprintId={setPlanningSprintId}
            canEdit={canEdit}
          />
        ) : null}

        {tab === 'board' ? (
          <div className="space-y-3">
            {!activeSprint ? (
              <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                Tidak ada sprint berstatus aktif. Set sprint ke &quot;Berjalan&quot;
                di tab Daftar untuk menggunakan board sprint.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <SprintStatusBadge status={activeSprint.status} />
                  <span className="font-semibold text-foreground">
                    {activeSprint.name}
                  </span>
                  {activeSprint.endDate ? (
                    <span className="text-muted-foreground">
                      Berakhir {formatRange(null, activeSprint.endDate)}
                    </span>
                  ) : null}
                </div>
                <SprintBoardMini
                  projectId={projectId}
                  activeSprintId={activeSprint.id}
                  boardLayout={boardLayout}
                  tasks={tasks}
                  canEdit={canEdit}
                />
              </>
            )}
          </div>
        ) : null}

        {tab === 'burndown' ? (
          <div className="space-y-4">
            {!burndownSprint || !burndownStats ? (
              <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                Belum ada sprint aktif atau selesai untuk burndown. Mulai atau
                selesaikan sprint di tab Daftar.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <SprintStatusBadge status={burndownSprint.status} />
                  <span className="font-semibold">{burndownSprint.name}</span>
                  {burndownSprint.endDate ? (
                    <span className="text-muted-foreground">
                      Berakhir {formatRange(null, burndownSprint.endDate)}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Total SP</p>
                    <p className="text-xl font-semibold tabular-nums">
                      {burndownStats.totalSP}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">SP selesai</p>
                    <p className="text-xl font-semibold tabular-nums text-emerald-600">
                      {burndownStats.doneSP}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Sisa SP</p>
                    <p
                      className={cn(
                        'text-xl font-semibold tabular-nums',
                        burndownStats.remainSP > 0 && 'text-amber-700',
                      )}
                    >
                      {burndownStats.remainSP}
                    </p>
                  </div>
                </div>
                {burndownSprint.startDate && burndownSprint.endDate ? (
                  burndownStats.totalSP > 0 ? (
                    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <p className="text-sm font-semibold text-foreground">
                        Burndown — {burndownSprint.name}
                      </p>
                      <SprintBurndownCanvas
                        startDate={burndownSprint.startDate}
                        endDate={burndownSprint.endDate}
                        totalSP={burndownStats.totalSP}
                        doneSP={burndownStats.doneSP}
                      />
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-0.5 w-3.5 rounded bg-slate-300" />
                          Ideal burndown
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-0.5 w-3.5 rounded bg-blue-600" />
                          Estimasi sisa SP (aktual)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Belum ada story point pada tugas sprint ini. Isi SP di
                      backlog agar burndown bermakna.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Atur tanggal mulai dan akhir sprint untuk menampilkan grafik.
                  </p>
                )}
              </>
            )}
          </div>
        ) : null}

        {tab === 'velocity' ? (
          <div className="space-y-6">
            {velocityBars.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                Belum ada data velocity. Mulai atau selesaikan sprint (selain
                perencanaan) untuk melihat grafik.
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                <p className="text-sm font-semibold text-foreground">
                  Velocity sprint (story point)
                </p>
                <SprintVelocityCanvas bars={velocityBars} />
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-300" />
                    SP terkomitmen
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-blue-600" />
                    SP selesai
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">
                Catatan retrospektif
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Ringkasan per sprint (apa yang baik, perbaikan, tindakan).
              </p>
              {sprints.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Tidak ada sprint.
                </p>
              ) : (
                <>
                  <div className="mt-4">
                    <label className="text-xs font-medium text-muted-foreground">
                      Pilih sprint
                    </label>
                    <SelectNative
                      className="mt-1 max-w-md"
                      value={effectiveRetroId}
                      onChange={(e) => setRetroSprintId(e.target.value)}
                      aria-label="Sprint untuk retro"
                    >
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <textarea
                    className="mt-3 min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Yang berjalan baik? Yang bisa diperbaiki? Tindakan lanjutan…"
                    value={retroDraft}
                    onChange={(e) => setRetroDraft(e.target.value)}
                    readOnly={!canEdit}
                  />
                  {canEdit ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={retroPending || !retroSprint}
                        onClick={() => {
                          if (!retroSprint) return;
                          startRetro(async () => {
                            const fd = new FormData();
                            fd.set('projectId', projectId);
                            fd.set('sprintId', retroSprint.id);
                            fd.set('retro', retroDraft);
                            const r = await updateSprintRetroAction(fd);
                            if (!r.ok) {
                              alert(r.error);
                              return;
                            }
                            router.refresh();
                          });
                        }}
                      >
                        Simpan catatan
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <SprintFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        projectId={projectId}
        sprint={editing}
      />
    </div>
  );
}
