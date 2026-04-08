'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { deleteSprintAction } from '@/app/actions/sprints';
import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import type { SprintRow } from '@/lib/sprint-types';
import {
  SPRINT_STATUSES,
  SPRINT_STATUS_LABEL,
} from '@/lib/sprint-constants';

import { SprintFormDialog } from './sprint-form-dialog';
import { SprintStatusBadge } from './sprint-status-badge';

type StatusFilter = 'all' | (typeof SPRINT_STATUSES)[number];

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

export function SprintClient(props: {
  projectId: string;
  sprints: SprintRow[];
  canEdit: boolean;
}) {
  const { projectId, sprints, canEdit } = props;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<SprintRow | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sprint</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Iterasi kerja per proyek. Tugas ditautkan dari{' '}
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
              <th className="px-3 py-2 font-medium tabular-nums">Tugas</th>
              {canEdit ? (
                <th className="px-3 py-2 text-right font-medium">Aksi</th>
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
                    <p className="font-medium text-foreground">{s.name}</p>
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
