'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Bug,
  Calendar,
  CheckSquare,
  LayoutGrid,
  List,
  ListTodo,
  MessageCircle,
  MoreVertical,
  Plus,
  Rows,
  Search,
  Settings2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { moveTaskOnBoardAction } from '@/app/actions/board';
import {
  resetProjectBoardLayoutAction,
  saveProjectBoardLayoutAction,
} from '@/app/actions/project-board-columns';
import type {
  BoardMemberPick,
  BoardSprintPick,
  BoardTaskCard,
} from '@/lib/board-types';
import {
  resolveColumnIdInLayout,
  type ProjectBoardColumn,
} from '@/lib/project-board-columns';
import { PRIORITY_LABEL, TASK_STATUS_LABEL, TASK_TYPE_LABEL } from '@/lib/task-labels';
import { TaskStatus, type Priority, type TaskType } from '@prisma/client';
import { cn } from '@/lib/utils';

import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';

const PRIORITY_BORDER: Record<Priority, string> = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f97316',
  critical: '#dc2626',
};

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function resolveDropColumnId(
  overId: UniqueIdentifier | null | undefined,
  taskById: Map<string, BoardTaskCard>,
  columns: ProjectBoardColumn[],
): string | null {
  if (overId == null) return null;
  const s = String(overId);
  if (s.startsWith('col-')) {
    const id = s.slice(4);
    return columns.some((c) => c.id === id) ? id : null;
  }
  if (s.startsWith('task-')) {
    const id = s.slice(5);
    const t = taskById.get(id);
    if (!t) return null;
    return resolveColumnIdInLayout(t.columnId, t.status, columns);
  }
  return null;
}

function statusOrderIndex(
  columns: ProjectBoardColumn[],
  status: TaskStatus,
): number {
  const i = columns.findIndex((c) => c.status === status);
  return i >= 0 ? i : 999;
}

function columnTitleForStatus(
  columns: ProjectBoardColumn[],
  status: TaskStatus,
): string {
  return (
    columns.find((c) => c.status === status)?.title ?? TASK_STATUS_LABEL[status]
  );
}

function TypeIcon({ type }: { type: TaskType }) {
  const cls = 'h-3.5 w-3.5 shrink-0 text-muted-foreground';
  switch (type) {
    case 'story':
      return <BookOpen className={cls} aria-hidden />;
    case 'bug':
      return <Bug className={cls} aria-hidden />;
    case 'enhancement':
      return <Sparkles className={cls} aria-hidden />;
    default:
      return <ListTodo className={cls} aria-hidden />;
  }
}

function TaskCardBody({
  task,
  projectId,
}: {
  task: BoardTaskCard;
  projectId: string;
}) {
  const border = PRIORITY_BORDER[task.priority];
  const overdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'done' &&
    task.status !== 'cancelled';

  return (
    <div
      className="border-l-[3px] pl-2.5"
      style={{ borderLeftColor: border }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <TypeIcon type={task.type} />
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {task.id.slice(0, 8)}…
          </span>
        </div>
        <span
          className="shrink-0 text-muted-foreground"
          title={PRIORITY_LABEL[task.priority]}
          aria-label={PRIORITY_LABEL[task.priority]}
        >
          ●
        </span>
      </div>
      <p className="mt-1 line-clamp-3 font-medium text-foreground">
        {task.title}
      </p>
      {task.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 ? (
            <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px]">
              +{task.tags.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}
      {task.sprintName ? (
        <div className="mt-1.5">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {task.sprintName}
          </span>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {task.checklistTotal > 0 ? (
            <span
              className="inline-flex items-center gap-0.5"
              title="Checklist"
            >
              <CheckSquare className="h-3 w-3" aria-hidden />
              {task.checklistDone}/{task.checklistTotal}
            </span>
          ) : null}
          {task.commentCount > 0 ? (
            <span
              className="inline-flex items-center gap-0.5"
              title="Komentar"
            >
              <MessageCircle className="h-3 w-3" aria-hidden />
              {task.commentCount}
            </span>
          ) : null}
          {task.storyPoints != null ? (
            <span className="tabular-nums">{task.storyPoints} SP</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {task.dueDate ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[11px]',
                overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
              )}
            >
              <Calendar className="h-3 w-3 shrink-0" aria-hidden />
              {new Date(task.dueDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          ) : null}
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((a) => (
              <div
                key={a.id}
                title={a.name}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-semibold text-primary-foreground"
              >
                {a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.image}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initials(a.name)
                )}
              </div>
            ))}
            {task.assignees.length > 3 ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium">
                +{task.assignees.length - 3}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <Link
        href={`/projects/${projectId}/backlog?task=${task.id}`}
        className="relative z-10 mt-2 inline-block text-xs font-medium text-primary hover:underline"
        onPointerDown={(e) => e.stopPropagation()}
      >
        Buka di backlog →
      </Link>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join('') || '?';
}

function DraggableTaskCard({
  task,
  projectId,
  disabled,
}: {
  task: BoardTaskCard;
  projectId: string;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
      disabled,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border border-border bg-card shadow-sm',
        isDragging && 'opacity-40',
      )}
    >
      <div
        {...listeners}
        {...attributes}
        className={cn(
          'p-3',
          disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        )}
      >
        <TaskCardBody task={task} projectId={projectId} />
      </div>
    </div>
  );
}

function BoardColumn({
  col,
  tasks,
  canEdit,
  projectId,
  columnCount,
  onRename,
  onDelete,
}: {
  col: ProjectBoardColumn;
  tasks: BoardTaskCard[];
  canEdit: boolean;
  projectId: string;
  columnCount: number;
  onRename: (col: ProjectBoardColumn) => void;
  onDelete: (col: ProjectBoardColumn) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.id}` });

  const sorted = useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 99) -
          (PRIORITY_ORDER[b.priority] ?? 99),
      ),
    [tasks],
  );

  return (
    <div className="flex min-w-[260px] max-w-[320px] flex-1 flex-col">
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[280px] flex-1 flex-col rounded-lg border border-border bg-surface/60 p-2',
          isOver && canEdit && 'ring-2 ring-primary/40',
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-1 px-1">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {col.title}
          </h3>
          <div className="flex shrink-0 items-center gap-0.5">
            <span className="text-xs tabular-nums text-muted-foreground">
              {sorted.length}
            </span>
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Menu kolom ${col.title}`}
                  >
                    <MoreVertical className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onRename(col)}>
                    Ubah nama
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={columnCount <= 1}
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(col)}
                  >
                    Hapus kolom
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {sorted.map((t) => (
            <DraggableTaskCard
              key={t.id}
              task={t}
              projectId={projectId}
              disabled={!canEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function useFilteredTasks(
  tasks: BoardTaskCard[],
  search: string,
  filterAssignee: string,
  filterPriority: string,
  filterTag: string,
  filterSprint: string,
) {
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchSearch =
        !q ||
        task.title.toLowerCase().includes(q) ||
        task.id.toLowerCase().includes(q) ||
        task.tags.some((t) => t.toLowerCase().includes(q));
      const matchAssignee =
        !filterAssignee ||
        task.assignees.some((a) => a.id === filterAssignee);
      const matchPriority =
        !filterPriority || task.priority === filterPriority;
      const matchTag = !filterTag || task.tags.includes(filterTag);
      const matchSprint =
        !filterSprint ||
        (filterSprint === '__none__'
          ? !task.sprintId
          : task.sprintId === filterSprint);
      return (
        matchSearch &&
        matchAssignee &&
        matchPriority &&
        matchTag &&
        matchSprint
      );
    });
  }, [tasks, search, filterAssignee, filterPriority, filterTag, filterSprint]);
}

function swimlaneMap(filtered: BoardTaskCard[]) {
  const m = new Map<string, BoardTaskCard[]>();
  for (const t of filtered) {
    if (t.assignees.length === 0) {
      const list = m.get('__unassigned__') ?? [];
      list.push(t);
      m.set('__unassigned__', list);
    } else {
      for (const a of t.assignees) {
        const list = m.get(a.id) ?? [];
        list.push(t);
        m.set(a.id, list);
      }
    }
  }
  return m;
}

export function BoardClient(props: {
  projectId: string;
  projectName: string;
  boardLayout: ProjectBoardColumn[];
  tasks: BoardTaskCard[];
  members: BoardMemberPick[];
  sprints: BoardSprintPick[];
  canEdit: boolean;
}) {
  const { projectId, projectName, boardLayout, tasks, members, sprints, canEdit } =
    props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const [columnsState, setColumnsState] =
    useState<ProjectBoardColumn[]>(boardLayout);
  useEffect(() => {
    setColumnsState(boardLayout);
  }, [boardLayout]);

  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addStatus, setAddStatus] = useState<TaskStatus>('todo');
  const [renameCol, setRenameCol] = useState<ProjectBoardColumn | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterSprint, setFilterSprint] = useState('');
  const [swimlane, setSwimlane] = useState(false);
  const [view, setView] = useState<'board' | 'list'>('board');

  const searchParams = useSearchParams();
  const sprintPrefApplied = useRef(false);
  useEffect(() => {
    if (sprintPrefApplied.current) return;
    const q = searchParams.get('sprint');
    if (q) {
      sprintPrefApplied.current = true;
      setFilterSprint(q);
    }
  }, [searchParams]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) for (const tag of t.tags) s.add(tag);
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'id'));
  }, [tasks]);

  const filtered = useFilteredTasks(
    tasks,
    search,
    filterAssignee,
    filterPriority,
    filterTag,
    filterSprint,
  );

  const filterActiveCount = useMemo(() => {
    let n = 0;
    if (filterAssignee) n++;
    if (filterPriority) n++;
    if (filterTag) n++;
    if (filterSprint) n++;
    return n;
  }, [filterAssignee, filterPriority, filterTag, filterSprint]);

  const taskById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t] as const)),
    [tasks],
  );

  const byColumn = useMemo(() => {
    const m = new Map<string, BoardTaskCard[]>();
    for (const c of columnsState) m.set(c.id, []);
    for (const t of filtered) {
      const col = resolveColumnIdInLayout(t.columnId, t.status, columnsState);
      const list = m.get(col);
      if (list) list.push(t);
    }
    return m;
  }, [filtered, columnsState]);

  function persistLayout(next: ProjectBoardColumn[]) {
    startTransition(async () => {
      const r = await saveProjectBoardLayoutAction(projectId, next);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  function openAddColumn() {
    setAddTitle('');
    setAddStatus('todo');
    setAddOpen(true);
  }

  function submitAddColumn() {
    const trimmed = addTitle.trim();
    if (!trimmed) return;
    const id = `c_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    persistLayout([...columnsState, { id, title: trimmed, status: addStatus }]);
    setAddOpen(false);
  }

  function openRenameColumn(col: ProjectBoardColumn) {
    setRenameTitle(col.title);
    setRenameCol(col);
  }

  function submitRenameColumn() {
    if (!renameCol) return;
    const trimmed = renameTitle.trim();
    if (!trimmed) return;
    persistLayout(
      columnsState.map((c) =>
        c.id === renameCol.id ? { ...c, title: trimmed } : c,
      ),
    );
    setRenameCol(null);
  }

  function requestDeleteColumn(col: ProjectBoardColumn) {
    if (columnsState.length <= 1) {
      alert('Minimal satu kolom.');
      return;
    }
    if (
      !confirm(
        `Hapus kolom "${col.title}"? Tugas di kolom ini akan dipetakan ulang ke kolom lain dengan status yang sama.`,
      )
    ) {
      return;
    }
    persistLayout(columnsState.filter((c) => c.id !== col.id));
  }

  function resetBoardLayout() {
    if (!confirm('Kembalikan kolom board ke default aplikasi?')) return;
    startTransition(async () => {
      const r = await resetProjectBoardLayoutAction(projectId);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const activeTask =
    activeId && String(activeId).startsWith('task-')
      ? taskById.get(String(activeId).slice(5))
      : undefined;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !canEdit || pending || swimlane || view === 'list') return;

    const taskId = String(active.id).replace(/^task-/, '');
    const targetCol = resolveDropColumnId(over.id, taskById, columnsState);
    if (!targetCol) return;

    const task = taskById.get(taskId);
    if (!task) return;
    const fromCol = resolveColumnIdInLayout(
      task.columnId,
      task.status,
      columnsState,
    );
    if (fromCol === targetCol) return;

    startTransition(async () => {
      const r = await moveTaskOnBoardAction({
        projectId,
        taskId,
        columnId: targetCol,
      });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  const lanes = swimlane ? swimlaneMap(filtered) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Board</h2>
          <p className="text-sm text-muted-foreground">{projectName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={swimlane ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSwimlane((s) => !s)}
            disabled={view === 'list'}
            title={
              view === 'list'
                ? 'Swimlane hanya untuk tampilan board'
                : undefined
            }
          >
            <Rows className="mr-1.5 h-4 w-4" aria-hidden />
            Swimlane
          </Button>
          <div className="flex rounded-md border border-border p-0.5">
            <Button
              type="button"
              variant={view === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView('board')}
            >
              <LayoutGrid className="mr-1 h-3.5 w-3.5" aria-hidden />
              Board
            </Button>
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
          </div>
          {canEdit ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    aria-label="Atur kolom board"
                  >
                    <Settings2 className="mr-1.5 h-4 w-4" aria-hidden />
                    Kolom
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={openAddColumn}>
                    Tambah kolom
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetBoardLayout}>
                    Reset ke default
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" size="sm" asChild>
                <Link href={`/projects/${projectId}/backlog?new=1`}>
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                  Tugas baru
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tugas…"
            className="pl-9"
            aria-label="Cari board"
          />
        </div>
        <FilterPanelSheet title="Filter board" activeCount={filterActiveCount}>
          <FilterField label="Penerima tugas">
            <SelectNative
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              aria-label="Filter penerima"
            >
              <option value="">Semua penerima</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Prioritas">
            <SelectNative
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              aria-label="Filter prioritas"
            >
              <option value="">Semua prioritas</option>
              {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          {allTags.length > 0 ? (
            <FilterField label="Label">
              <SelectNative
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
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
          {sprints.length > 0 ? (
            <FilterField label="Sprint">
              <SelectNative
                value={filterSprint}
                onChange={(e) => setFilterSprint(e.target.value)}
                aria-label="Filter sprint"
              >
                <option value="">Semua sprint</option>
                <option value="__none__">Tanpa sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
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
              setFilterAssignee('');
              setFilterPriority('');
              setFilterTag('');
              setFilterSprint('');
            }}
          >
            Reset filter
          </Button>
        </FilterPanelSheet>
      </div>

      {filterActiveCount > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filterAssignee ? (
            <FilterChip
              label={`Penerima: ${members.find((m) => m.id === filterAssignee)?.name ?? filterAssignee}`}
              onRemove={() => setFilterAssignee('')}
            />
          ) : null}
          {filterPriority ? (
            <FilterChip
              label={`Prioritas: ${PRIORITY_LABEL[filterPriority as Priority]}`}
              onRemove={() => setFilterPriority('')}
            />
          ) : null}
          {filterTag ? (
            <FilterChip
              label={`Label: ${filterTag}`}
              onRemove={() => setFilterTag('')}
            />
          ) : null}
          {filterSprint ? (
            <FilterChip
              label={
                filterSprint === '__none__'
                  ? 'Sprint: tanpa sprint'
                  : `Sprint: ${sprints.find((s) => s.id === filterSprint)?.name ?? filterSprint}`
              }
              onRemove={() => setFilterSprint('')}
            />
          ) : null}
        </div>
      ) : null}

      {!canEdit ? (
        <p className="text-sm text-muted-foreground">
          Anda hanya dapat melihat board (tanpa memindahkan kartu).
        </p>
      ) : null}
      {swimlane && view === 'board' ? (
        <p className="text-xs text-muted-foreground">
          Mode swimlane: seret kartu dinonaktifkan. Gunakan tampilan board biasa
          untuk memindahkan tugas antar kolom.
        </p>
      ) : null}

      {view === 'list' ? (
        <BoardListTable
          columns={columnsState}
          tasks={filtered}
          projectId={projectId}
        />
      ) : swimlane && lanes ? (
        <SwimlaneGrid
          columns={columnsState}
          lanes={lanes}
          members={members}
          projectId={projectId}
        />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columnsState.map((col) => (
              <BoardColumn
                key={col.id}
                col={col}
                tasks={byColumn.get(col.id) ?? []}
                canEdit={canEdit}
                projectId={projectId}
                columnCount={columnsState.length}
                onRename={openRenameColumn}
                onDelete={requestDeleteColumn}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="w-[280px] rounded-lg border border-border bg-card p-3 shadow-lg">
                <TaskCardBody task={activeTask} projectId={projectId} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah kolom</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Judul kolom
              </label>
              <Input
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Mis. Siap QA"
                maxLength={80}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Status tugas
              </label>
              <SelectNative
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value as TaskStatus)}
                aria-label="Status kolom baru"
              >
                {(Object.values(TaskStatus) as TaskStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {TASK_STATUS_LABEL[st]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={!addTitle.trim() || pending}
              onClick={submitAddColumn}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameCol != null}
        onOpenChange={(o) => {
          if (!o) setRenameCol(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah nama kolom</DialogTitle>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Judul
            </label>
            <Input
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              maxLength={80}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameCol(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={!renameTitle.trim() || pending}
              onClick={submitRenameColumn}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function BoardListTable({
  columns,
  tasks,
  projectId,
}: {
  columns: ProjectBoardColumn[];
  tasks: BoardTaskCard[];
  projectId: string;
}) {
  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const oa = statusOrderIndex(columns, a.status);
        const ob = statusOrderIndex(columns, b.status);
        if (oa !== ob) return oa - ob;
        return a.title.localeCompare(b.title, 'id');
      }),
    [tasks, columns],
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        Tidak ada tugas yang cocok dengan filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Tugas</th>
            <th className="px-3 py-2 font-medium">Tipe</th>
            <th className="px-3 py-2 font-medium">Prioritas</th>
            <th className="px-3 py-2 font-medium">Sprint</th>
            <th className="px-3 py-2 font-medium">Jatuh tempo</th>
            <th className="px-3 py-2 font-medium">Penerima</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((t) => (
            <tr key={t.id} className="hover:bg-surface/40">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {columnTitleForStatus(columns, t.status)}
              </td>
              <td className="max-w-[280px] px-3 py-2">
                <Link
                  href={`/projects/${projectId}/backlog?task=${t.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {t.title}
                </Link>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {t.id.slice(0, 10)}…
                </p>
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {TASK_TYPE_LABEL[t.type]}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {PRIORITY_LABEL[t.priority]}
              </td>
              <td className="max-w-[120px] truncate px-3 py-2 text-muted-foreground">
                {t.sprintName ?? '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {t.dueDate
                  ? new Date(t.dueDate).toLocaleDateString('id-ID')
                  : '—'}
              </td>
              <td className="max-w-[160px] truncate px-3 py-2 text-xs text-muted-foreground">
                {t.assignees.length === 0
                  ? '—'
                  : t.assignees.map((a) => a.name).join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SwimlaneGrid({
  columns,
  lanes,
  members,
  projectId,
}: {
  columns: ProjectBoardColumn[];
  lanes: Map<string, BoardTaskCard[]>;
  members: BoardMemberPick[];
  projectId: string;
}) {
  if (lanes.size === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        Tidak ada tugas yang cocok dengan filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="inline-grid min-w-full gap-0 rounded-lg border border-border bg-card"
        style={{
          gridTemplateColumns: `minmax(140px,180px) repeat(${columns.length}, minmax(200px,1fr))`,
        }}
      >
        <div className="border-b border-r border-border bg-muted/40 p-2" />
        {columns.map((col) => (
          <div
            key={col.id}
            className="border-b border-r border-border bg-muted/40 p-2 text-center text-xs font-semibold last:border-r-0"
          >
            {col.title}
          </div>
        ))}
        {Array.from(lanes.entries()).map(([uid, laneTasks]) => {
          const member =
            uid === '__unassigned__'
              ? null
              : members.find((m) => m.id === uid);
          const name =
            uid === '__unassigned__' ? 'Belum ditugaskan' : member?.name ?? uid;
          const ini = member ? initials(member.name) : '?';
          return (
            <div key={uid} className="contents">
              <div className="flex items-center gap-2 border-b border-r border-border bg-surface/50 p-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {ini}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {laneTasks.length} tugas
                  </p>
                </div>
              </div>
              {columns.map((col) => {
                const colTasks = laneTasks.filter(
                  (t) =>
                    resolveColumnIdInLayout(t.columnId, t.status, columns) ===
                    col.id,
                );
                const sorted = [...colTasks].sort(
                  (a, b) =>
                    (PRIORITY_ORDER[a.priority] ?? 99) -
                    (PRIORITY_ORDER[b.priority] ?? 99),
                );
                return (
                  <div
                    key={col.id}
                    className="border-b border-r border-border p-1.5 align-top last:border-r-0"
                  >
                    <div className="flex flex-col gap-2">
                      {sorted.map((t) => (
                        <div
                          key={`${uid}-${t.id}`}
                          className="rounded-lg border border-border bg-card p-2 shadow-sm"
                        >
                          <TaskCardBody task={t} projectId={projectId} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
