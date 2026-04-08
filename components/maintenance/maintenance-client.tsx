'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { deleteMaintenanceAction } from '@/app/actions/maintenance';
import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import type { ProjectMemberPick } from '@/lib/backlog-types';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
} from '@/lib/maintenance-labels';
import type { MaintenanceRow } from '@/lib/maintenance-types';
import { PRIORITY_LABEL } from '@/lib/project-labels';
import { MaintenanceStatus, MaintenanceType } from '@prisma/client';

import { MaintenanceFormDialog } from './maintenance-form-dialog';
import { MaintenanceStatusBadge } from './maintenance-status-badge';

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
      className="text-destructive hover:text-destructive"
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

export function MaintenanceClient(props: {
  projectId: string;
  rows: MaintenanceRow[];
  members: ProjectMemberPick[];
  canEdit: boolean;
}) {
  const { projectId, rows, members, canEdit } = props;
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<StatusFilter>('all');
  const [typeF, setTypeF] = useState<TypeFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<MaintenanceRow | null>(null);

  const filterActiveCount = useMemo(() => {
    let n = 0;
    if (statusF !== 'all') n++;
    if (typeF !== 'all') n++;
    return n;
  }, [statusF, typeF]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const blob = [r.title, r.description ?? '', r.notes ?? '']
        .join(' ')
        .toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchS = statusF === 'all' || r.status === statusF;
      const matchT = typeF === 'all' || r.type === typeF;
      return matchQ && matchS && matchT;
    });
  }, [rows, search, statusF, typeF]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Maintenance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tiket perawatan pasca go-live. Laporan agregat di{' '}
            <Link
              href={`/projects/${projectId}/maintenance-report`}
              className="text-primary underline-offset-4 hover:underline"
            >
              laporan maintenance
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
            Tiket baru
          </Button>
        ) : null}
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
        </FilterPanelSheet>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Judul</th>
              <th className="px-3 py-2 font-medium">Tipe</th>
              <th className="px-3 py-2 font-medium">Prioritas</th>
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
                  colSpan={canEdit ? 7 : 6}
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
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormMode('edit');
                            setEditing(r);
                            setFormOpen(true);
                          }}
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
