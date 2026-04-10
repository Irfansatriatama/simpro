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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { moveTaskOnBoardAction } from '@/app/actions/board';
import {
  resolveColumnIdInLayout,
  type ProjectBoardColumn,
} from '@/lib/project-board-columns';
import type { SprintTaskRef } from '@/lib/sprint-planning-types';
import { PRIORITY_LABEL } from '@/lib/task-labels';
import type { TaskStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

const SPRINT_BOARD_STATUSES: TaskStatus[] = [
  'todo',
  'in_progress',
  'in_review',
  'done',
];

export type SprintBoardMiniTask = SprintTaskRef & { projectIdHint: string };

function resolveDropColumnId(
  overId: UniqueIdentifier | null | undefined,
  taskById: Map<string, SprintBoardMiniTask>,
  columns: ProjectBoardColumn[],
): string | null {
  if (overId == null) return null;
  const s = String(overId);
  if (s.startsWith('scol-')) {
    const id = s.slice(5);
    return columns.some((c) => c.id === id) ? id : null;
  }
  if (s.startsWith('stask-')) {
    const id = s.slice(7);
    const t = taskById.get(id);
    if (!t) return null;
    return resolveColumnIdInLayout(t.columnId, t.status, columns);
  }
  return null;
}

function MiniCard({ task }: { task: SprintBoardMiniTask }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-muted-foreground">
        {task.id.slice(0, 8)}…
      </p>
      <p className="mt-0.5 line-clamp-2 text-sm font-medium text-foreground">
        {task.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
        <span>{PRIORITY_LABEL[task.priority]}</span>
        {task.storyPoints != null ? (
          <span className="tabular-nums">{task.storyPoints} SP</span>
        ) : null}
      </div>
      <Link
        href={`/projects/${task.projectIdHint}/backlog?task=${task.id}`}
        className="relative z-10 mt-2 inline-block text-xs text-primary hover:underline"
        onPointerDown={(e) => e.stopPropagation()}
      >
        Buka →
      </Link>
    </div>
  );
}

function DraggableMini({
  task,
  disabled,
}: {
  task: SprintBoardMiniTask;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `stask-${task.id}`,
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
        'rounded-md border border-border bg-card p-2.5 shadow-sm',
        isDragging && 'opacity-40',
      )}
    >
      <div
        {...listeners}
        {...attributes}
        className={cn(
          disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        )}
      >
        <MiniCard task={task} />
      </div>
    </div>
  );
}

function MiniColumn({
  columnId,
  title,
  tasks,
  canEdit,
}: {
  columnId: string;
  title: string;
  tasks: SprintBoardMiniTask[];
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `scol-${columnId}` });
  return (
    <div className="flex min-w-[200px] max-w-[260px] flex-1 flex-col">
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[200px] flex-1 flex-col rounded-lg border border-border bg-surface/60 p-2',
          isOver && canEdit && 'ring-2 ring-primary/40',
        )}
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-foreground">{title}</h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <DraggableMini key={t.id} task={t} disabled={!canEdit} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SprintBoardMini(props: {
  projectId: string;
  activeSprintId: string;
  boardLayout: ProjectBoardColumn[];
  tasks: SprintTaskRef[];
  canEdit: boolean;
}) {
  const { projectId, activeSprintId, boardLayout, tasks, canEdit } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const inSprint = useMemo(
    () => tasks.filter((t) => t.sprintId === activeSprintId),
    [tasks, activeSprintId],
  );

  const backlogInSprint = useMemo(
    () => inSprint.filter((t) => t.status === 'backlog').length,
    [inSprint],
  );

  const withHint: SprintBoardMiniTask[] = useMemo(
    () => inSprint.map((t) => ({ ...t, projectIdHint: projectId })),
    [inSprint, projectId],
  );

  const taskById = useMemo(
    () => new Map(withHint.map((t) => [t.id, t] as const)),
    [withHint],
  );

  const sprintColumns = useMemo(
    () =>
      boardLayout.filter((c) => SPRINT_BOARD_STATUSES.includes(c.status)),
    [boardLayout],
  );

  const byColumn = useMemo(() => {
    const m = new Map<string, SprintBoardMiniTask[]>();
    for (const c of sprintColumns) m.set(c.id, []);
    for (const t of withHint) {
      if (!SPRINT_BOARD_STATUSES.includes(t.status)) continue;
      const col = resolveColumnIdInLayout(t.columnId, t.status, sprintColumns);
      const list = m.get(col);
      if (list) list.push(t);
    }
    return m;
  }, [withHint, sprintColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const activeTask =
    activeId && String(activeId).startsWith('stask-')
      ? taskById.get(String(activeId).slice(7))
      : undefined;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !canEdit || pending) return;
    const taskId = String(active.id).replace(/^stask-/, '');
    const targetCol = resolveDropColumnId(over.id, taskById, sprintColumns);
    if (!targetCol) return;
    const task = taskById.get(taskId);
    if (!task) return;
    const fromCol = resolveColumnIdInLayout(
      task.columnId,
      task.status,
      sprintColumns,
    );
    if (fromCol === targetCol) return;
    startTransition(async () => {
      const r = await moveTaskOnBoardAction({ projectId, taskId, columnId: targetCol });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {backlogInSprint > 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {backlogInSprint} tugas masih berstatus backlog — tidak tampil di kolom
          board ini. Ubah status lewat{' '}
          <Link href={`/projects/${projectId}/backlog`} className="underline">
            backlog
          </Link>
          .
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sprintColumns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada kolom board untuk status sprint (todo, in progress,
              review, done). Atur kolom di halaman Board proyek.
            </p>
          ) : (
            sprintColumns.map((col) => (
              <MiniColumn
                key={col.id}
                columnId={col.id}
                title={col.title}
                tasks={byColumn.get(col.id) ?? []}
                canEdit={canEdit}
              />
            ))
          )}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="w-[220px] rounded-md border border-border bg-card p-2.5 shadow-lg">
              <MiniCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
