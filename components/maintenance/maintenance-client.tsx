'use client';

import { MaintenanceStatus, MaintenanceType, Priority, Severity } from '@prisma/client';
import {
  Columns2,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  createTaskFromMaintenanceAction,
  deleteMaintenanceAction,
} from '@/app/actions/maintenance';
import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import type { ProjectMemberPick } from '@/lib/backlog-types';
import { userCanInteractMaintenanceTicketAsPic } from '@/lib/maintenance-board';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
  SEVERITY_LABEL,
} from '@/lib/maintenance-labels';
import type { MaintenanceRow } from '@/lib/maintenance-types';
import type { AppRole } from '@/lib/nav-config';
import { PRIORITY_LABEL } from '@/lib/project-labels';

import { MaintenanceBoardView } from './maintenance-board-view';
import { MaintenanceFormDialog } from './maintenance-form-dialog';
import { MaintenanceStatusBadge } from './maintenance-status-badge';

const VIEW_STORAGE_PREFIX = 'simpro_maint_view_';

function DeleteMaintenanceButton(props: {
  projectId: string;
  row: MaintenanceRow;
}) {
  const { projectId, row } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-danger/50 text-danger hover:bg-danger/10 hover:text-danger"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Hapus tiket "${row.title}"?`)) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set('projectId', projectId);
          fd.set('maintenanceId', row.id);
          const r = await deleteMaintenanceAction(fd);
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

type StatusFilter = 'all' | MaintenanceStatus;
type TypeFilter = 'all' | MaintenanceType;
type PriorityFilter = 'all' | Priority;
type SeverityFilter = 'all' | Severity | '__none__';
type PicDevFilter = 'all' | string;

function CreateBacklogTaskFromMaintButton(props: {
  projectId: string;
  row: MaintenanceRow;
  userRole: AppRole;
  currentUserId: string;
}) {
  const { projectId, row, userRole, currentUserId } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const allowed =
    userCanInteractMaintenanceTicketAsPic(row, userRole, currentUserId);

  if (!allowed) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
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
      {pending ? '…' : 'Tugas backlog'}
    </Button>
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

export function MaintenanceClient(props: {
  projectId: string;
  rows: MaintenanceRow[];
  members: ProjectMemberPick[];
  canEdit: boolean;
  canViewReport: boolean;
  currentUserId: string;
  userRole: AppRole;
}) {
  const {
    projectId,
    rows,
    members,
    canEdit,
    canViewReport,
    currentUserId,
    userRole,
  } = props;

  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<StatusFilter>('all');
  const [typeF, setTypeF] = useState<TypeFilter>('all');
  const [priorityF, setPriorityF] = useState<PriorityFilter>('all');
  const [severityF, setSeverityF] = useState<SeverityFilter>('all');
  const [picDevF, setPicDevF] = useState<PicDevFilter>('all');
  const [view, setView] = useState<'list' | 'board'>('board');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<MaintenanceRow | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`${VIEW_STORAGE_PREFIX}${projectId}`);
      if (v === 'list' || v === 'board') setView(v);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  function persistView(next: 'list' | 'board') {
    setView(next);
    try {
      localStorage.setItem(`${VIEW_STORAGE_PREFIX}${projectId}`, next);
    } catch {
      /* ignore */
    }
  }

  const filterActiveCount = useMemo(() => {
    let n = 0;
    if (statusF !== 'all') n++;
    if (typeF !== 'all') n++;
    if (priorityF !== 'all') n++;
    if (severityF !== 'all') n++;
    if (picDevF !== 'all') n++;
    return n;
  }, [statusF, typeF, priorityF, severityF, picDevF]);

  const stats = useMemo(() => {
    const total = rows.length;
    const backlog = rows.filter(
      (r) => r.status === MaintenanceStatus.backlog,
    ).length;
    const inFlightStatuses: MaintenanceStatus[] = [
      MaintenanceStatus.in_progress,
      MaintenanceStatus.awaiting_approval,
      MaintenanceStatus.on_check,
      MaintenanceStatus.need_revision,
    ];
    const inFlight = rows.filter((r) =>
      inFlightStatuses.includes(r.status),
    ).length;
    const completed = rows.filter(
      (r) => r.status === MaintenanceStatus.completed,
    ).length;
    const parked = rows.filter(
      (r) =>
        r.status === MaintenanceStatus.canceled ||
        r.status === MaintenanceStatus.on_hold,
    ).length;
    return { total, backlog, inFlight, completed, parked };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const blob = [r.title, r.description ?? '', r.notes ?? '']
        .join(' ')
        .toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchS = statusF === 'all' || r.status === statusF;
      const matchT = typeF === 'all' || r.type === typeF;
      const matchP = priorityF === 'all' || r.priority === priorityF;
      const matchSeverity =
        severityF === 'all'
          ? true
          : severityF === '__none__'
            ? r.severity == null
            : r.severity === severityF;
      const matchPic =
        picDevF === 'all' ||
        r.picDevs.some((p) => p.userId === picDevF);
      return matchQ && matchS && matchT && matchP && matchSeverity && matchPic;
    });
  }, [rows, search, statusF, typeF, priorityF, severityF, picDevF]);

  function openEdit(r: MaintenanceRow) {
    setFormMode('edit');
    setEditing(r);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Maintenance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tiket perawatan pasca go-live — tampilan daftar atau board (alur
            status).
            {canViewReport ? (
              <>
                {' '}
                Laporan terfilter & ekspor CSV/Excel/PDF di{' '}
                <Link
                  href={`/projects/${projectId}/maintenance-report`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  laporan maintenance
                </Link>
                .
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <Button
              type="button"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => persistView('list')}
            >
              <List className="mr-1 h-3.5 w-3.5" aria-hidden />
              Daftar
            </Button>
            <Button
              type="button"
              variant={view === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => persistView('board')}
            >
              <LayoutGrid className="mr-1 h-3.5 w-3.5" aria-hidden />
              Board
            </Button>
          </div>
          {canViewReport ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}/maintenance-report`}>
                <FileText className="mr-2 h-4 w-4" aria-hidden />
                Laporan
              </Link>
            </Button>
          ) : null}
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
              Tiket baru
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-card">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {stats.total}
          </p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-card">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {stats.backlog}
          </p>
          <p className="text-xs text-muted-foreground">Backlog</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-card">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {stats.inFlight}
          </p>
          <p className="text-xs text-muted-foreground">Sedang proses</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-card">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {stats.completed}
          </p>
          <p className="text-xs text-muted-foreground">Selesai</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-card sm:col-span-1 col-span-2">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {stats.parked}
          </p>
          <p className="text-xs text-muted-foreground">Parkir</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau catatan…"
            className="pl-9"
            aria-label="Cari maintenance"
          />
        </div>
        <FilterPanelSheet
          title="Filter maintenance"
          activeCount={filterActiveCount}
        >
          <FilterField label="Status">
            <SelectNative
              value={statusF}
              onChange={(e) => setStatusF(e.target.value as StatusFilter)}
              className="w-full"
              aria-label="Filter status"
            >
              <option value="all">Semua status</option>
              {Object.values(MaintenanceStatus).map((s) => (
                <option key={s} value={s}>
                  {MAINTENANCE_STATUS_LABEL[s]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Tipe">
            <SelectNative
              value={typeF}
              onChange={(e) => setTypeF(e.target.value as TypeFilter)}
              className="w-full"
              aria-label="Filter tipe"
            >
              <option value="all">Semua tipe</option>
              {Object.values(MaintenanceType).map((t) => (
                <option key={t} value={t}>
                  {MAINTENANCE_TYPE_LABEL[t]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Prioritas">
            <SelectNative
              value={priorityF}
              onChange={(e) =>
                setPriorityF(e.target.value as PriorityFilter)
              }
              className="w-full"
              aria-label="Filter prioritas"
            >
              <option value="all">Semua prioritas</option>
              {Object.values(Priority).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Severity">
            <SelectNative
              value={severityF}
              onChange={(e) =>
                setSeverityF(e.target.value as SeverityFilter)
              }
              className="w-full"
              aria-label="Filter severity"
            >
              <option value="all">Semua</option>
              <option value={Severity.major}>
                {SEVERITY_LABEL[Severity.major]}
              </option>
              <option value={Severity.minor}>
                {SEVERITY_LABEL[Severity.minor]}
              </option>
              <option value="__none__">Tanpa severity</option>
            </SelectNative>
          </FilterField>
          <FilterField label="PIC developer">
            <SelectNative
              value={picDevF}
              onChange={(e) => setPicDevF(e.target.value as PicDevFilter)}
              className="w-full"
              aria-label="Filter PIC developer"
            >
              <option value="all">Semua PIC</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        </FilterPanelSheet>
      </div>

      {filterActiveCount > 0 ? (
        <div className="flex flex-wrap gap-2">
          {statusF !== 'all' ? (
            <FilterChip
              label={`Status: ${MAINTENANCE_STATUS_LABEL[statusF]}`}
              onRemove={() => setStatusF('all')}
            />
          ) : null}
          {typeF !== 'all' ? (
            <FilterChip
              label={`Tipe: ${MAINTENANCE_TYPE_LABEL[typeF]}`}
              onRemove={() => setTypeF('all')}
            />
          ) : null}
          {priorityF !== 'all' ? (
            <FilterChip
              label={`Prioritas: ${PRIORITY_LABEL[priorityF]}`}
              onRemove={() => setPriorityF('all')}
            />
          ) : null}
          {severityF !== 'all' ? (
            <FilterChip
              label={
                severityF === '__none__'
                  ? 'Severity: —'
                  : `Severity: ${SEVERITY_LABEL[severityF as Severity]}`
              }
              onRemove={() => setSeverityF('all')}
            />
          ) : null}
          {picDevF !== 'all' ? (
            <FilterChip
              label={`PIC: ${members.find((m) => m.id === picDevF)?.name ?? picDevF}`}
              onRemove={() => setPicDevF('all')}
            />
          ) : null}
        </div>
      ) : null}

      {view === 'board' ? (
        <>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Columns2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Board: saluran utama lalu parkir. Seret kartu untuk ubah status
            (developer hanya tiket tempat Anda PIC). Tombol di kartu membuat
            tugas backlog terkait.
          </p>
          <MaintenanceBoardView
            projectId={projectId}
            rows={filtered}
            canEdit={canEdit}
            userRole={userRole}
            currentUserId={currentUserId}
            onOpenTicket={openEdit}
          />
        </>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Judul</th>
                <th className="px-3 py-2 font-medium">Tipe</th>
                <th className="px-3 py-2 font-medium">Prioritas</th>
                <th className="px-3 py-2 font-medium">Severity</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Jatuh tempo</th>
                <th className="px-3 py-2 font-medium">PIC dev</th>
                {canEdit ? (
                  <th className="px-3 py-2 text-right font-medium">Aksi</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 8 : 7}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    Tidak ada tiket yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/40">
                    <td className="max-w-[240px] px-3 py-2">
                      <p className="font-medium text-foreground">{r.title}</p>
                      {r.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {MAINTENANCE_TYPE_LABEL[r.type]}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {PRIORITY_LABEL[r.priority]}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {r.severity
                        ? SEVERITY_LABEL[r.severity]
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <MaintenanceStatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {r.dueDate
                        ? new Date(r.dueDate).toLocaleDateString('id-ID')
                        : '—'}
                    </td>
                    <td className="max-w-[160px] px-3 py-2 text-xs text-muted-foreground">
                      {r.picDevs.length === 0
                        ? '—'
                        : r.picDevs.map((p) => p.name).join(', ')}
                    </td>
                    {canEdit ? (
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <CreateBacklogTaskFromMaintButton
                            projectId={projectId}
                            row={r}
                            userRole={userRole}
                            currentUserId={currentUserId}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(r)}
                          >
                            Edit
                          </Button>
                          <DeleteMaintenanceButton
                            projectId={projectId}
                            row={r}
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
      )}

      <MaintenanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        projectId={projectId}
        members={members}
        row={editing}
      />
    </div>
  );
}
