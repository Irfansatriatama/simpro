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
import { TaskType } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { moveTaskOnBoardAction } from '@/app/actions/board';
import type { BacklogTaskRow } from '@/lib/backlog-types';
import {
  resolveColumnIdInLayout,
  type ProjectBoardColumn,
} from '@/lib/project-board-columns';
import { PRIORITY_LABEL, TASK_TYPE_LABEL } from '@/lib/task-labels';
import { cn } from '@/lib/utils';

function resolveDropColumnId(
  overId: UniqueIdentifier | null | undefined,
  taskById: Map<string, BacklogTaskRow>,
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

function BacklogBoardCard({
  task,
  projectId,
  canDrag,
  onOpenTask,
}: {
  task: BacklogTaskRow;
  projectId: string;
  canDrag: boolean;
  onOpenTask: (t: BacklogTaskRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
      disabled: !canDrag,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const epic = task.type === TaskType.epic;

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
        {...(canDrag ? listeners : {})}
        {...(canDrag ? attributes : {})}
        className={cn(
          'p-2.5',
          canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {task.title}
          </p>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onOpenTask(task)}
            className="shrink-0 text-xs text-primary hover:underline"
          >
            Detail
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{TASK_TYPE_LABEL[task.type]}</span>
          <span>{PRIORITY_LABEL[task.priority]}</span>
          {task.storyPoints != null ? (
            <span className="tabular-nums">{task.storyPoints} SP</span>
          ) : null}
        </div>
        {epic ? (
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
            Epic: seret dinonaktifkan (sama seperti board proyek).
          </p>
        ) : null}
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {task.id.slice(0, 10)}…
        </p>
        <a
          href={`/projects/${projectId}/backlog?task=${task.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-1 inline-block text-[11px] text-primary hover:underline"
        >
          Tautan langsung
        </a>
      </div>
    </div>
  );
}

function BacklogBoardColumn({
  col,
  tasks,
  projectId,
  canEdit,
  onOpenTask,
}: {
  col: ProjectBoardColumn;
  tasks: BacklogTaskRow[];
  projectId: string;
  canEdit: boolean;
  onOpenTask: (t: BacklogTaskRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.id}` });

  return (
    <div className="flex min-w-[240px] max-w-[300px] flex-1 flex-col">
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[260px] flex-1 flex-col rounded-lg border border-border bg-surface/60 p-2',
          isOver && canEdit && 'ring-2 ring-primary/40',
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {col.title}
          </h3>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <BacklogBoardCard
              key={t.id}
              task={t}
              projectId={projectId}
              canDrag={canEdit && t.type !== TaskType.epic}
              onOpenTask={onOpenTask}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BacklogBoardView(props: {
  projectId: string;
  boardLayout: ProjectBoardColumn[];
  tasks: BacklogTaskRow[];
  canEdit: boolean;
  onOpenTask: (t: BacklogTaskRow) => void;
}) {
  const { projectId, boardLayout, tasks, canEdit, onOpenTask } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const taskById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t] as const)),
    [tasks],
  );

  const byColumn = useMemo(() => {
    const m = new Map<string, BacklogTaskRow[]>();
    for (const c of boardLayout) m.set(c.id, []);
    for (const t of tasks) {
      const col = resolveColumnIdInLayout(t.columnId, t.status, boardLayout);
      const list = m.get(col);
      if (list) list.push(t);
    }
    return m;
  }, [tasks, boardLayout]);

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
    if (!over || !canEdit || pending) return;

    const taskId = String(active.id).replace(/^task-/, '');
    const task = taskById.get(taskId);
    if (!task || task.type === TaskType.epic) return;

    const targetCol = resolveDropColumnId(over.id, taskById, boardLayout);
    if (!targetCol) return;

    const fromCol = resolveColumnIdInLayout(
      task.columnId,
      task.status,
      boardLayout,
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

  if (boardLayout.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Tidak ada kolom board. Atur layout di halaman Board proyek.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {boardLayout.map((col) => (
          <BacklogBoardColumn
            key={col.id}
            col={col}
            tasks={byColumn.get(col.id) ?? []}
            projectId={projectId}
            canEdit={canEdit}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-[260px] rounded-lg border border-border bg-card p-2.5 shadow-lg">
            <p className="line-clamp-2 text-sm font-medium">{activeTask.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {TASK_TYPE_LABEL[activeTask.type]}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
