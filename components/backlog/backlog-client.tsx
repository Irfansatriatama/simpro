'use client';

import { Priority, TaskStatus, TaskType } from '@prisma/client';
import {
  Download,
  LayoutGrid,
  Layers,
  List,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  bulkDeleteTasksAction,
  bulkUpdateTasksAction,
} from '@/app/actions/tasks';
import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import type {
  BacklogTaskRow,
  EpicPick,
  ProjectMemberPick,
  SprintPick,
} from '@/lib/backlog-types';
import type { ProjectBoardColumn } from '@/lib/project-board-columns';
import {
  PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_TYPE_LABEL,
} from '@/lib/task-labels';
import { cn } from '@/lib/utils';

import { BacklogBoardView } from './backlog-board-view';
import { DeleteTaskButton } from './delete-task-button';
import { TaskFormDialog } from './task-form-dialog';

type DepPick = { id: string; title: string };

const TASK_STATUS_SORT_ORDER: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
];

function statusSortRank(s: TaskStatus): number {
  const i = TASK_STATUS_SORT_ORDER.indexOf(s);
  return i === -1 ? 99 : i;
}

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type SortMode =
  | 'created_desc'
  | 'created_asc'
  | 'updated_desc'
  | 'updated_asc'
  | 'priority_desc'
  | 'priority_asc'
  | 'due_asc'
  | 'due_desc'
  | 'status_asc'
  | 'sp_desc'
  | 'sp_asc'
  | 'title_asc';

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function statusCellLabel(
  row: BacklogTaskRow,
  columns: ProjectBoardColumn[],
): string {
  if (row.columnId) {
    const byCol = columns.find((x) => x.id === row.columnId);
    if (byCol) return byCol.title;
  }
  return (
    columns.find((c) => c.status === row.status)?.title ??
    TASK_STATUS_LABEL[row.status]
  );
}

function sortBacklogRows(rows: BacklogTaskRow[], mode: SortMode): BacklogTaskRow[] {
  const arr = [...rows];
  const dueNum = (d: string | null) =>
    d ? new Date(d).getTime() : Number.NaN;
  const spNum = (sp: number | null) => (sp == null ? Number.NaN : sp);

  arr.sort((a, b) => {
    switch (mode) {
      case 'created_desc':
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'created_asc':
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'updated_desc':
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      case 'updated_asc':
        return (
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
      case 'priority_desc':
        return (
          (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
        );
      case 'priority_asc':
        return (
          (PRIORITY_ORDER[b.priority] ?? 9) - (PRIORITY_ORDER[a.priority] ?? 9)
        );
      case 'due_asc': {
        const na = dueNum(a.dueDate);
        const nb = dueNum(b.dueDate);
        const aBad = Number.isNaN(na);
        const bBad = Number.isNaN(nb);
        if (aBad && bBad) return 0;
        if (aBad) return 1;
        if (bBad) return -1;
        return na - nb;
      }
      case 'due_desc': {
        const na = dueNum(a.dueDate);
        const nb = dueNum(b.dueDate);
        const aBad = Number.isNaN(na);
        const bBad = Number.isNaN(nb);
        if (aBad && bBad) return 0;
        if (aBad) return 1;
        if (bBad) return -1;
        return nb - na;
      }
      case 'status_asc': {
        const c = statusSortRank(a.status) - statusSortRank(b.status);
        if (c !== 0) return c;
        return a.title.localeCompare(b.title, 'id');
      }
      case 'sp_desc': {
        const na = spNum(a.storyPoints);
        const nb = spNum(b.storyPoints);
        const aBad = Number.isNaN(na);
        const bBad = Number.isNaN(nb);
        if (aBad && bBad) return 0;
        if (aBad) return 1;
        if (bBad) return -1;
        return nb - na;
      }
      case 'sp_asc': {
        const na = spNum(a.storyPoints);
        const nb = spNum(b.storyPoints);
        const aBad = Number.isNaN(na);
        const bBad = Number.isNaN(nb);
        if (aBad && bBad) return 0;
        if (aBad) return 1;
        if (bBad) return -1;
        return na - nb;
      }
      case 'title_asc':
        return a.title.localeCompare(b.title, 'id');
      default:
        return 0;
    }
  });
  return arr;
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

function BacklogTaskTable({
  rows,
  projectId,
  canEdit,
  boardLayout,
  selectedIds,
  onToggleRow,
  onToggleAllForRows,
  onEdit,
}: {
  rows: BacklogTaskRow[];
  projectId: string;
  canEdit: boolean;
  boardLayout: ProjectBoardColumn[];
  selectedIds: Set<string>;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAllForRows: (rows: BacklogTaskRow[], checked: boolean) => void;
  onEdit: (t: BacklogTaskRow) => void;
}) {
  const headerRef = useRef<HTMLInputElement>(null);
  const selectable = rows.filter((t) => t.type !== TaskType.epic);
  const allSel =
    selectable.length > 0 &&
    selectable.every((t) => selectedIds.has(t.id));
  const someSel = selectable.some((t) => selectedIds.has(t.id));

  useEffect(() => {
    const el = headerRef.current;
    if (el) el.indeterminate = someSel && !allSel;
  }, [someSel, allSel]);

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Tidak ada tugas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
          <tr>
            {canEdit ? (
              <th className="w-10 px-2 py-2">
                <input
                  ref={headerRef}
                  type="checkbox"
                  checked={allSel}
                  onChange={(e) =>
                    onToggleAllForRows(rows, e.target.checked)
                  }
                  disabled={selectable.length === 0}
                  className="h-4 w-4 rounded border-border"
                  aria-label="Pilih semua pada bagian ini"
                />
              </th>
            ) : null}
            <th className="px-3 py-2 font-medium">Judul</th>
            <th className="px-3 py-2 font-medium">Tipe</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Prioritas</th>
            <th className="px-3 py-2 font-medium">SP</th>
            <th className="px-3 py-2 font-medium">Sprint</th>
            <th className="px-3 py-2 font-medium">Epic</th>
            <th className="px-3 py-2 font-medium">Penerima</th>
            <th className="px-3 py-2 font-medium">Jatuh tempo</th>
            {canEdit ? (
              <th className="px-3 py-2 text-right font-medium">Aksi</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((t) => {
            const bulkOk = t.type !== TaskType.epic;
            return (
              <tr
                key={t.id}
                className={cn(
                  'hover:bg-surface/40',
                  bulkOk && selectedIds.has(t.id) && 'bg-primary/5',
                )}
              >
                {canEdit ? (
                  <td className="px-2 py-2">
                    {bulkOk ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={(e) =>
                          onToggleRow(t.id, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-border"
                        aria-label={`Pilih ${t.title}`}
                      />
                    ) : (
                      <span
                        className="text-[10px] text-muted-foreground"
                        title="Epic tidak termasuk aksi massal"
                      >
                        —
                      </span>
                    )}
                  </td>
                ) : null}
                <td className="max-w-[220px] px-3 py-2">
                  <p className="font-medium text-foreground">{t.title}</p>
                  {t.commentCount + t.checklistCount + t.attachmentCount >
                  0 ? (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {t.commentCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5"
                          title="Komentar"
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                          {t.commentCount}
                        </span>
                      ) : null}
                      {t.checklistCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5"
                          title="Checklist"
                        >
                          <ListChecks className="h-3.5 w-3.5 shrink-0" />
                          {t.checklistCount}
                        </span>
                      ) : null}
                      {t.attachmentCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5"
                          title="Lampiran"
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          {t.attachmentCount}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {t.dependsOn.length > 0 ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tergantung:{' '}
                      {t.dependsOn.map((d) => d.title).join(', ')}
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {TASK_TYPE_LABEL[t.type]}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {statusCellLabel(t, boardLayout)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {PRIORITY_LABEL[t.priority]}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {t.storyPoints ?? '—'}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-muted-foreground">
                  {t.sprintName ?? '—'}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-muted-foreground">
                  {t.epicTitle ?? '—'}
                </td>
                <td className="max-w-[140px] px-3 py-2 text-xs text-muted-foreground">
                  {t.assignees.length === 0
                    ? '—'
                    : t.assignees.map((a) => a.name).join(', ')}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {t.dueDate
                    ? new Date(t.dueDate).toLocaleDateString('id-ID')
                    : '—'}
                </td>
                {canEdit ? (
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(t)}
                      >
                        Edit
                      </Button>
                      <DeleteTaskButton
                        projectId={projectId}
                        taskId={t.id}
                      />
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function BacklogClient(props: {
  projectId: string;
  boardLayout: ProjectBoardColumn[];
  tasks: BacklogTaskRow[];
  assigneeMembers: ProjectMemberPick[];
  reporterMembers: ProjectMemberPick[];
  sprints: SprintPick[];
  epics: EpicPick[];
  dependencyOptions: DepPick[];
  canEdit: boolean;
  currentUserId: string;
  canModerateComments: boolean;
}) {
  const {
    projectId,
    boardLayout,
    tasks,
    assigneeMembers,
    reporterMembers,
    sprints,
    epics,
    dependencyOptions,
    canEdit,
    currentUserId,
    canModerateComments,
  } = props;

  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<'all' | TaskStatus>('all');
  const [typeF, setTypeF] = useState<'all' | TaskType>('all');
  const [priorityF, setPriorityF] = useState<'all' | Priority>('all');
  const [sprintF, setSprintF] = useState<string>('all');
  const [epicF, setEpicF] = useState<string>('all');
  const [assigneeF, setAssigneeF] = useState<string>('');
  const [tagF, setTagF] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('created_desc');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [groupEpic, setGroupEpic] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkKey, setBulkKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<BacklogTaskRow | null>(null);

  const searchParams = useSearchParams();
  const openedFromQuery = useRef(false);

  useEffect(() => {
    if (openedFromQuery.current) return;
    const taskId = searchParams.get('task');
    const wantNew = searchParams.get('new');
    if (!taskId && wantNew !== '1') return;
    openedFromQuery.current = true;
    if (taskId) {
      const t = tasks.find((x) => x.id === taskId);
      if (t) {
        setDialogMode('edit');
        setEditing(t);
        setDialogOpen(true);
      }
    } else if (wantNew === '1' && canEdit) {
      setDialogMode('create');
      setEditing(null);
      setDialogOpen(true);
    }
    router.replace(`/projects/${projectId}/backlog`, { scroll: false });
  }, [searchParams, tasks, projectId, router, canEdit]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) for (const tag of t.tags) s.add(tag);
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'id'));
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const blob =
        `${t.title} ${t.description ?? ''} ${t.tags.join(' ')}`.toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchS = statusF === 'all' || t.status === statusF;
      const matchTy = typeF === 'all' || t.type === typeF;
      const matchP = priorityF === 'all' || t.priority === priorityF;
      const matchSp =
        sprintF === 'all' ||
        (sprintF === 'none' ? !t.sprintId : t.sprintId === sprintF);
      const matchE =
        epicF === 'all' ||
        (epicF === 'none' ? !t.epicId : t.epicId === epicF);
      const matchA =
        !assigneeF || t.assignees.some((a) => a.userId === assigneeF);
      const matchTag = !tagF || t.tags.includes(tagF);
      return (
        matchQ && matchS && matchTy && matchP && matchSp && matchE && matchA && matchTag
      );
    });
  }, [
    tasks,
    search,
    statusF,
    typeF,
    priorityF,
    sprintF,
    epicF,
    assigneeF,
    tagF,
  ]);

  const sortedRows = useMemo(
    () => sortBacklogRows(filtered, sortMode),
    [filtered, sortMode],
  );

  const backlogFilterActiveCount = useMemo(() => {
    let n = 0;
    if (statusF !== 'all') n++;
    if (typeF !== 'all') n++;
    if (priorityF !== 'all') n++;
    if (sprintF !== 'all') n++;
    if (epicF !== 'all') n++;
    if (assigneeF) n++;
    if (tagF) n++;
    return n;
  }, [statusF, typeF, priorityF, sprintF, epicF, assigneeF, tagF]);

  const grouped = useMemo(() => {
    if (!groupEpic) return null;
    const map = new Map<string | null, BacklogTaskRow[]>();
    for (const t of sortedRows) {
      const key = t.epicId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      const ta = tasks.find((x) => x.epicId === a)?.epicTitle ?? '';
      const tb = tasks.find((x) => x.epicId === b)?.epicTitle ?? '';
      return ta.localeCompare(tb);
    });
    return keys.map((k) => ({
      epicId: k,
      epicTitle:
        k === null
          ? 'Tanpa epic'
          : sortedRows.find((t) => t.epicId === k)?.epicTitle ?? k,
      items: map.get(k) ?? [],
    }));
  }, [sortedRows, groupEpic, tasks]);

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllForRows(rows: BacklogTaskRow[], checked: boolean) {
    const selectable = rows.filter((t) => t.type !== TaskType.epic).map((t) => t.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) for (const id of selectable) next.add(id);
      else for (const id of selectable) next.delete(id);
      return next;
    });
  }

  function bulkEligibleIds(): string[] {
    return Array.from(selectedIds).filter((id) => {
      const t = tasks.find((x) => x.id === id);
      return t && t.type !== TaskType.epic;
    });
  }

  function runBulkUpdate(
    fn: () => Promise<
      { ok: true } | { ok: false; error: string }
    >,
  ) {
    const ids = bulkEligibleIds();
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        alert(r.error ?? 'Gagal');
        return;
      }
      setSelectedIds(new Set());
      setBulkKey((k) => k + 1);
      router.refresh();
    });
  }

  function exportCsv() {
    const headers = [
      'id',
      'title',
      'type',
      'status',
      'priority',
      'story_points',
      'sprint',
      'epic',
      'assignees',
      'due_date',
      'tags',
      'created_at',
    ];
    const lines = [headers.join(',')];
    for (const t of sortedRows) {
      const assignees = t.assignees.map((a) => a.name).join('; ');
      const tags = t.tags.join('; ');
      lines.push(
        [
          escapeCsvField(t.id),
          escapeCsvField(t.title),
          t.type,
          t.status,
          t.priority,
          t.storyPoints ?? '',
          escapeCsvField(t.sprintName ?? ''),
          escapeCsvField(t.epicTitle ?? ''),
          escapeCsvField(assignees),
          t.dueDate ? t.dueDate.slice(0, 10) : '',
          escapeCsvField(tags),
          t.createdAt.slice(0, 10),
        ].join(','),
      );
    }
    const body = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([body], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backlog-${projectId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openEdit(t: BacklogTaskRow) {
    setDialogMode('edit');
    setEditing(t);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Backlog</h2>
          <p className="text-sm text-muted-foreground">
            Kelola tugas, epic, sprint assignment, dan dependensi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <Button
              type="button"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView('list')}
            >
              <List className="mr-1 h-3.5 w-3.5" aria-hidden />
              Daftar
            </Button>
            <Button
              type="button"
              variant={view === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => {
                setGroupEpic(false);
                setView('board');
              }}
            >
              <LayoutGrid className="mr-1 h-3.5 w-3.5" aria-hidden />
              Board
            </Button>
          </div>
          <Button
            type="button"
            variant={groupEpic ? 'default' : 'outline'}
            size="sm"
            disabled={view === 'board'}
            title={
              view === 'board'
                ? 'Beralih ke daftar untuk grup epic'
                : undefined
            }
            onClick={() => setGroupEpic((g) => !g)}
          >
            <Layers className="mr-1.5 h-4 w-4" />
            Grup epic
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportCsv}
            title="Ekspor baris yang terlihat (sesuai filter & urutan)"
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden />
            CSV
          </Button>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setDialogMode('create');
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Tugas baru
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, deskripsi, tag…"
            className="pl-9"
          />
        </div>
        <SelectNative
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="h-10 w-full min-w-[200px] sm:w-auto"
          aria-label="Urutkan"
        >
          <option value="created_desc">Urut: dibuat (terbaru)</option>
          <option value="created_asc">Urut: dibuat (terlama)</option>
          <option value="updated_desc">Urut: diperbarui (terbaru)</option>
          <option value="updated_asc">Urut: diperbarui (terlama)</option>
          <option value="priority_desc">Urut: prioritas (kritis dulu)</option>
          <option value="priority_asc">Urut: prioritas (rendah dulu)</option>
          <option value="due_asc">Urut: jatuh tempo (dekat dulu)</option>
          <option value="due_desc">Urut: jatuh tempo (jauh dulu)</option>
          <option value="status_asc">Urut: status alur kerja</option>
          <option value="sp_desc">Urut: SP (tinggi dulu)</option>
          <option value="sp_asc">Urut: SP (rendah dulu)</option>
          <option value="title_asc">Urut: judul A–Z</option>
        </SelectNative>
        <FilterPanelSheet
          title="Filter backlog"
          activeCount={backlogFilterActiveCount}
        >
          <FilterField label="Status">
            <SelectNative
              value={statusF}
              onChange={(e) =>
                setStatusF(e.target.value as 'all' | TaskStatus)
              }
              className="w-full"
            >
              <option value="all">Semua status</option>
              {Object.values(TaskStatus).map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABEL[s]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Tipe">
            <SelectNative
              value={typeF}
              onChange={(e) => setTypeF(e.target.value as 'all' | TaskType)}
              className="w-full"
            >
              <option value="all">Semua tipe</option>
              {Object.values(TaskType).map((ty) => (
                <option key={ty} value={ty}>
                  {TASK_TYPE_LABEL[ty]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Prioritas">
            <SelectNative
              value={priorityF}
              onChange={(e) =>
                setPriorityF(e.target.value as 'all' | Priority)
              }
              className="w-full"
            >
              <option value="all">Semua prioritas</option>
              {Object.values(Priority).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Sprint">
            <SelectNative
              value={sprintF}
              onChange={(e) => setSprintF(e.target.value)}
              className="w-full"
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
          <FilterField label="Epic">
            <SelectNative
              value={epicF}
              onChange={(e) => setEpicF(e.target.value)}
              className="w-full"
            >
              <option value="all">Semua epic</option>
              <option value="none">Tanpa epic</option>
              {epics.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title.length > 40 ? `${e.title.slice(0, 40)}…` : e.title}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Penerima tugas">
            <SelectNative
              value={assigneeF}
              onChange={(e) => setAssigneeF(e.target.value)}
              className="w-full"
              aria-label="Filter penerima"
            >
              <option value="">Semua penerima</option>
              {assigneeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          {allTags.length > 0 ? (
            <FilterField label="Label">
              <SelectNative
                value={tagF}
                onChange={(e) => setTagF(e.target.value)}
                className="w-full"
                aria-label="Filter label"
              >
                <option value="">Semua label</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </SelectNative>
            </FilterField>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setStatusF('all');
              setTypeF('all');
              setPriorityF('all');
              setSprintF('all');
              setEpicF('all');
              setAssigneeF('');
              setTagF('');
            }}
          >
            Reset filter
          </Button>
        </FilterPanelSheet>
      </div>

      {backlogFilterActiveCount > 0 ? (
        <div className="flex flex-wrap gap-2">
          {statusF !== 'all' ? (
            <FilterChip
              label={`Status: ${TASK_STATUS_LABEL[statusF]}`}
              onRemove={() => setStatusF('all')}
            />
          ) : null}
          {typeF !== 'all' ? (
            <FilterChip
              label={`Tipe: ${TASK_TYPE_LABEL[typeF]}`}
              onRemove={() => setTypeF('all')}
            />
          ) : null}
          {priorityF !== 'all' ? (
            <FilterChip
              label={`Prioritas: ${PRIORITY_LABEL[priorityF]}`}
              onRemove={() => setPriorityF('all')}
            />
          ) : null}
          {sprintF !== 'all' ? (
            <FilterChip
              label={
                sprintF === 'none'
                  ? 'Sprint: tanpa sprint'
                  : `Sprint: ${sprints.find((s) => s.id === sprintF)?.name ?? sprintF}`
              }
              onRemove={() => setSprintF('all')}
            />
          ) : null}
          {epicF !== 'all' ? (
            <FilterChip
              label={
                epicF === 'none'
                  ? 'Epic: tanpa epic'
                  : `Epic: ${epics.find((e) => e.id === epicF)?.title ?? epicF}`
              }
              onRemove={() => setEpicF('all')}
            />
          ) : null}
          {assigneeF ? (
            <FilterChip
              label={`Penerima: ${assigneeMembers.find((m) => m.id === assigneeF)?.name ?? assigneeF}`}
              onRemove={() => setAssigneeF('')}
            />
          ) : null}
          {tagF ? (
            <FilterChip
              label={`Label: ${tagF}`}
              onRemove={() => setTagF('')}
            />
          ) : null}
        </div>
      ) : null}

      {canEdit && selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium text-foreground">
            {bulkEligibleIds().length} dipilih
          </span>
          <SelectNative
            key={`bulk-st-${bulkKey}`}
            defaultValue=""
            disabled={pending}
            className="h-9 w-[160px] text-sm"
            aria-label="Ubah status massal"
            onChange={(e) => {
              const v = e.target.value;
              if (
                v === '' ||
                !(Object.values(TaskStatus) as string[]).includes(v)
              ) {
                return;
              }
              runBulkUpdate(() =>
                bulkUpdateTasksAction({
                  projectId,
                  taskIds: bulkEligibleIds(),
                  status: v as TaskStatus,
                }),
              );
            }}
          >
            <option value="">Status…</option>
            {Object.values(TaskStatus).map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            key={`bulk-pr-${bulkKey}`}
            defaultValue=""
            disabled={pending}
            className="h-9 w-[160px] text-sm"
            aria-label="Ubah prioritas massal"
            onChange={(e) => {
              const v = e.target.value;
              if (
                v === '' ||
                !(Object.values(Priority) as string[]).includes(v)
              ) {
                return;
              }
              runBulkUpdate(() =>
                bulkUpdateTasksAction({
                  projectId,
                  taskIds: bulkEligibleIds(),
                  priority: v as Priority,
                }),
              );
            }}
          >
            <option value="">Prioritas…</option>
            {Object.values(Priority).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            key={`bulk-sp-${bulkKey}`}
            defaultValue=""
            disabled={pending}
            className="h-9 min-w-[180px] text-sm"
            aria-label="Tetapkan sprint massal"
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') return;
              const sprintId = v === '__none__' ? null : v;
              runBulkUpdate(() =>
                bulkUpdateTasksAction({
                  projectId,
                  taskIds: bulkEligibleIds(),
                  sprintId,
                }),
              );
            }}
          >
            <option value="">Sprint…</option>
            <option value="__none__">Tanpa sprint</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectNative>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-danger/50 text-danger hover:bg-danger/10 hover:text-danger"
            disabled={pending}
            onClick={() => {
              const n = bulkEligibleIds().length;
              if (n === 0) return;
              if (
                !confirm(
                  `Hapus ${n} tugas yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
                )
              ) {
                return;
              }
              runBulkUpdate(() =>
                bulkDeleteTasksAction({
                  projectId,
                  taskIds: bulkEligibleIds(),
                }),
              );
            }}
          >
            Hapus
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Batal pilihan
          </Button>
        </div>
      ) : null}

      {view === 'board' ? (
        <>
          {!canEdit ? (
            <p className="text-sm text-muted-foreground">
              Anda hanya dapat melihat board backlog.
            </p>
          ) : null}
          <BacklogBoardView
            projectId={projectId}
            boardLayout={boardLayout}
            tasks={sortedRows}
            canEdit={canEdit}
            onOpenTask={openEdit}
          />
        </>
      ) : groupEpic && grouped ? (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.epicId ?? 'none'}>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {g.epicTitle}
              </h3>
              <BacklogTaskTable
                rows={g.items}
                projectId={projectId}
                canEdit={canEdit}
                boardLayout={boardLayout}
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onToggleAllForRows={toggleAllForRows}
                onEdit={openEdit}
              />
            </div>
          ))}
        </div>
      ) : (
        <BacklogTaskTable
          rows={sortedRows}
          projectId={projectId}
          canEdit={canEdit}
          boardLayout={boardLayout}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAllForRows={toggleAllForRows}
          onEdit={openEdit}
        />
      )}

      {canEdit ? (
        <TaskFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          projectId={projectId}
          task={dialogMode === 'edit' ? editing : null}
          assigneeMembers={assigneeMembers}
          reporterMembers={reporterMembers}
          sprints={sprints}
          epics={epics}
          dependencyOptions={dependencyOptions}
          canEdit={canEdit}
          defaultReporterId={currentUserId}
          currentUserId={currentUserId}
          canModerateComments={canModerateComments}
        />
      ) : null}
    </div>
  );
}
