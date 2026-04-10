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
import { MaintenanceStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import {
  createTaskFromMaintenanceAction,
  moveMaintenanceStatusAction,
} from '@/app/actions/maintenance';
import {
  ALL_BOARD_MAINTENANCE_STATUSES,
  MAIN_PIPELINE_MAINTENANCE_STATUSES,
  PARKING_LOT_MAINTENANCE_STATUSES,
  userCanInteractMaintenanceTicketAsPic,
} from '@/lib/maintenance-board';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
  SEVERITY_LABEL,
} from '@/lib/maintenance-labels';
import type { MaintenanceRow } from '@/lib/maintenance-types';
import type { AppRole } from '@/lib/nav-config';
import { PRIORITY_LABEL } from '@/lib/project-labels';
import { cn } from '@/lib/utils';

import { Button } from '../ui/button';
import { MaintenanceStatusBadge } from './maintenance-status-badge';

function resolveDropStatus(
  overId: UniqueIdentifier | null | undefined,
  ticketById: Map<string, MaintenanceRow>,
): MaintenanceStatus | null {
  if (overId == null) return null;
  const s = String(overId);
  if (s.startsWith('mcol-')) {
    const st = s.slice(5) as MaintenanceStatus;
    return ALL_BOARD_MAINTENANCE_STATUSES.includes(st) ? st : null;
  }
  if (s.startsWith('mtask-')) {
    const id = s.slice(6);
    return ticketById.get(id)?.status ?? null;
  }
  return null;
}

function BoardCard({
  row,
  canDrag,
  projectId,
  onOpen,
}: {
  row: MaintenanceRow;
  canDrag: boolean;
  projectId: string;
  onOpen: (r: MaintenanceRow) => void;
}) {
  const router = useRouter();
  const [taskPending, startTask] = useTransition();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `mtask-${row.id}`,
      disabled: !canDrag,
    });
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const dueLabel = row.dueDate
    ? new Date(row.dueDate).toLocaleDateString('id-ID')
    : null;

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
          <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
            {row.title}
          </p>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onOpen(row)}
            className="shrink-0 text-xs text-primary hover:underline"
          >
            Detail
          </button>
        </div>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {row.id}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="rounded bg-border/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {MAINTENANCE_TYPE_LABEL[row.type]}
          </span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {PRIORITY_LABEL[row.priority]}
          </span>
          {row.severity ? (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-100">
              {SEVERITY_LABEL[row.severity]}
            </span>
          ) : null}
          <MaintenanceStatusBadge status={row.status} />
        </div>
        {dueLabel ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Jatuh tempo: {dueLabel}
          </p>
        ) : null}
        {row.picDevs.length > 0 ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
            PIC: {row.picDevs.map((p) => p.name).join(', ')}
          </p>
        ) : null}
      </div>
      {canDrag ? (
        <div className="border-t border-border px-2.5 py-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 w-full text-xs"
            disabled={taskPending}
            onClick={() => {
              startTask(async () => {
                const r = await createTaskFromMaintenanceAction({
                  projectId,
                  maintenanceId: row.id,
                });
                if (!r.ok) {
                  window.alert(r.error);
                  return;
                }
                if (
                  window.confirm(
                    'Tugas backlog dibuat. Buka halaman backlog sekarang?',
                  )
                ) {
                  router.push(`/projects/${projectId}/backlog`);
                } else {
                  router.refresh();
                }
              });
            }}
          >
            {taskPending ? 'Membuat…' : 'Buat tugas backlog'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function BoardColumn({
  status,
  tickets,
  canEdit,
  userRole,
  currentUserId,
  projectId,
  onOpen,
}: {
  status: MaintenanceStatus;
  tickets: MaintenanceRow[];
  canEdit: boolean;
  userRole: AppRole;
  currentUserId: string;
  projectId: string;
  onOpen: (r: MaintenanceRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `mcol-${status}` });
  const title = MAINTENANCE_STATUS_LABEL[status];

  return (
    <div className="flex min-w-[240px] max-w-[280px] flex-1 flex-col">
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[220px] flex-1 flex-col rounded-lg border border-border bg-surface/60 p-2',
          isOver && canEdit && 'ring-2 ring-primary/40',
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {title}
          </h3>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {tickets.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {tickets.map((row) => (
            <BoardCard
              key={row.id}
              row={row}
              canDrag={
                canEdit &&
                userCanInteractMaintenanceTicketAsPic(
                  row,
                  userRole,
                  currentUserId,
                )
              }
              projectId={projectId}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BoardSection(props: {
  title: string;
  subtitle?: string;
  statuses: MaintenanceStatus[];
  projectId: string;
  byStatus: Map<MaintenanceStatus, MaintenanceRow[]>;
  canEdit: boolean;
  userRole: AppRole;
  currentUserId: string;
  onOpenTicket: (r: MaintenanceRow) => void;
}) {
  const {
    title,
    subtitle,
    statuses,
    projectId,
    byStatus,
    canEdit,
    userRole,
    currentUserId,
    onOpenTicket,
  } = props;

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {statuses.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tickets={byStatus.get(status) ?? []}
            canEdit={canEdit}
            userRole={userRole}
            currentUserId={currentUserId}
            projectId={projectId}
            onOpen={onOpenTicket}
          />
        ))}
      </div>
    </div>
  );
}

export function MaintenanceBoardView(props: {
  projectId: string;
  rows: MaintenanceRow[];
  canEdit: boolean;
  userRole: AppRole;
  currentUserId: string;
  onOpenTicket: (r: MaintenanceRow) => void;
}) {
  const {
    projectId,
    rows,
    canEdit,
    userRole,
    currentUserId,
    onOpenTicket,
  } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const ticketById = useMemo(
    () => new Map(rows.map((r) => [r.id, r] as const)),
    [rows],
  );

  const byStatus = useMemo(() => {
    const m = new Map<MaintenanceStatus, MaintenanceRow[]>();
    for (const st of ALL_BOARD_MAINTENANCE_STATUSES) m.set(st, []);
    for (const r of rows) {
      const list = m.get(r.status);
      if (list) list.push(r);
    }
    return m;
  }, [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const activeRow =
    activeId && String(activeId).startsWith('mtask-')
      ? ticketById.get(String(activeId).slice(6))
      : undefined;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !canEdit || pending) return;

    const maintenanceId = String(active.id).replace(/^mtask-/, '');
    const targetStatus = resolveDropStatus(over.id, ticketById);
    if (!targetStatus) return;

    const row = ticketById.get(maintenanceId);
    if (!row || row.status === targetStatus) return;

    if (
      !canEdit ||
      !userCanInteractMaintenanceTicketAsPic(row, userRole, currentUserId)
    ) {
      window.alert('Anda tidak dapat memindahkan tiket ini.');
      return;
    }

    startTransition(async () => {
      const r = await moveMaintenanceStatusAction({
        projectId,
        maintenanceId,
        status: targetStatus,
      });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-8">
        <BoardSection
          title="Saluran utama"
          subtitle="Alur dari backlog hingga selesai."
          statuses={MAIN_PIPELINE_MAINTENANCE_STATUSES}
          projectId={projectId}
          byStatus={byStatus}
          canEdit={canEdit}
          userRole={userRole}
          currentUserId={currentUserId}
          onOpenTicket={onOpenTicket}
        />
        <BoardSection
          title="Parkir"
          subtitle="Dibatalkan atau ditahan — di luar alur aktif."
          statuses={PARKING_LOT_MAINTENANCE_STATUSES}
          projectId={projectId}
          byStatus={byStatus}
          canEdit={canEdit}
          userRole={userRole}
          currentUserId={currentUserId}
          onOpenTicket={onOpenTicket}
        />
      </div>
      <DragOverlay dropAnimation={null}>
        {activeRow ? (
          <div className="w-[260px] rounded-lg border border-border bg-card p-2.5 shadow-lg">
            <p className="line-clamp-2 text-sm font-medium">{activeRow.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {MAINTENANCE_TYPE_LABEL[activeRow.type]}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
