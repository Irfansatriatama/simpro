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
import { BOARD_COLUMNS, resolveBoardColumnId } from '@/lib/board-columns';
import type { BoardTaskCard } from '@/lib/board-types';
import { PRIORITY_LABEL } from '@/lib/task-labels';
import { cn } from '@/lib/utils';

function resolveDropColumnId(
  overId: UniqueIdentifier | null | undefined,
  taskById: Map<string, BoardTaskCard>,
): string | null {
  if (overId == null) return null;
  const s = String(overId);
  if (s.startsWith('col-')) return s.slice(4);
  if (s.startsWith('task-')) {
    const id = s.slice(5);
    const t = taskById.get(id);
    if (!t) return null;
    return resolveBoardColumnId(t.columnId, t.status);
  }
  return null;
}

function TaskCardBody({ task }: { task: BoardTaskCard }) {
  return (
    <>
      <p className="line-clamp-3 font-medium text-foreground">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="rounded bg-border/70 px-1.5 py-0.5">
          {PRIORITY_LABEL[task.priority]}
        </span>
        {task.storyPoints != null ? (
          <span className="tabular-nums">{task.storyPoints} SP</span>
        ) : null}
        {task.assigneeNames.length > 0 ? (
          <span className="truncate">
            {task.assigneeNames.slice(0, 2).join(', ')}
            {task.assigneeNames.length > 2 ? '…' : ''}
          </span>
        ) : null}
      </div>
    </>
  );
}

function DraggableTaskCard({
  task,
  disabled,
}: {
  task: BoardTaskCard;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
      disabled,
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
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
        <TaskCardBody task={task} />
      </div>
    </div>
  );
}

function BoardColumn({
  columnId,
  title,
  tasks,
  canEdit,
}: {
  columnId: string;
  title: string;
  tasks: BoardTaskCard[];
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${columnId}`,
  });

  return (
    <div className="flex min-w-[260px] max-w-[320px] flex-1 flex-col">
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[280px] flex-1 flex-col rounded-lg border border-border bg-surface/60 p-2',
          isOver && canEdit && 'ring-2 ring-primary/40',
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <DraggableTaskCard key={t.id} task={t} disabled={!canEdit} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BoardClient(props: {
  projectId: string;
  tasks: BoardTaskCard[];
  canEdit: boolean;
}) {
  const { projectId, tasks, canEdit } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const taskById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t] as const)),
    [tasks],
  );

  const byColumn = useMemo(() => {
    const m = new Map<string, BoardTaskCard[]>();
    for (const c of BOARD_COLUMNS) m.set(c.id, []);
    for (const t of tasks) {
      const col = resolveBoardColumnId(t.columnId, t.status);
      const list = m.get(col);
      if (list) list.push(t);
    }
    return m;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
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
    const targetCol = resolveDropColumnId(over.id, taskById);
    if (!targetCol) return;

    const task = taskById.get(taskId);
    if (!task) return;
    const fromCol = resolveBoardColumnId(task.columnId, task.status);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Board</h2>
          <p className="text-sm text-muted-foreground">
            Seret kartu antar kolom. Status tugas diselaraskan dengan kolom.
            Epic tidak ditampilkan di sini.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/backlog`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Buka backlog →
        </Link>
      </div>

      {!canEdit ? (
        <p className="text-sm text-muted-foreground">
          Anda hanya dapat melihat board (tanpa memindahkan kartu).
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              columnId={col.id}
              title={col.title}
              tasks={byColumn.get(col.id) ?? []}
              canEdit={canEdit}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="w-[280px] rounded-lg border border-border bg-card p-3 shadow-lg">
              <TaskCardBody task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
