'use client';

import {
  Priority,
  ProjectPhase,
  ProjectStatus,
} from '@prisma/client';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import {
  PRIORITY_LABEL,
  PROJECT_PHASE_LABEL,
  PROJECT_STATUS_LABEL,
} from '@/lib/project-labels';
import type { ProjectListRow } from '@/lib/project-types';

import { ProjectFormDialog } from './project-form-dialog';

type ClientOpt = { id: string; companyName: string };
type ParentOpt = { id: string; code: string; name: string };

export function ProjectsClient(props: {
  projects: ProjectListRow[];
  canManage: boolean;
  clients: ClientOpt[];
  parents: ParentOpt[];
}) {
  const { projects, canManage, clients, parents } = props;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | ProjectStatus
  >('all');
  const [phaseFilter, setPhaseFilter] = useState<
    'all' | 'none' | ProjectPhase
  >('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>(
    'all',
  );
  const [clientFilter, setClientFilter] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const blob = `${p.code} ${p.name} ${p.description ?? ''} ${p.clientName ?? ''} ${p.tags?.join(' ') ?? ''}`.toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchS = statusFilter === 'all' || p.status === statusFilter;
      const matchPh =
        phaseFilter === 'all' ||
        (phaseFilter === 'none'
          ? p.phase === null
          : p.phase === phaseFilter);
      const matchPr =
        priorityFilter === 'all' || p.priority === priorityFilter;
      const matchC =
        clientFilter === 'all' ||
        (clientFilter === 'none' ? !p.clientId : p.clientId === clientFilter);
      return matchQ && matchS && matchPh && matchPr && matchC;
    });
  }, [
    projects,
    search,
    statusFilter,
    phaseFilter,
    priorityFilter,
    clientFilter,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Proyek</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin & PM melihat semua proyek; peran lain hanya proyek yang
            diikuti.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Proyek baru
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-[200px] flex-1 lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, klien, tag…"
            className="pl-9"
            aria-label="Cari proyek"
          />
        </div>
        <SelectNative
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'all' | ProjectStatus)
          }
          className="w-full lg:w-44"
          aria-label="Filter status"
        >
          <option value="all">Semua status</option>
          {Object.values(ProjectStatus).map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABEL[s]}
            </option>
          ))}
        </SelectNative>
        <SelectNative
          value={phaseFilter}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'all') setPhaseFilter('all');
            else if (v === 'none') setPhaseFilter('none');
            else setPhaseFilter(v as ProjectPhase);
          }}
          className="w-full lg:w-44"
          aria-label="Filter fase"
        >
          <option value="all">Semua fase</option>
          <option value="none">Tanpa fase</option>
          {Object.values(ProjectPhase).map((ph) => (
            <option key={ph} value={ph}>
              {PROJECT_PHASE_LABEL[ph]}
            </option>
          ))}
        </SelectNative>
        <SelectNative
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value as 'all' | Priority)
          }
          className="w-full lg:w-40"
          aria-label="Filter prioritas"
        >
          <option value="all">Semua prioritas</option>
          {Object.values(Priority).map((pr) => (
            <option key={pr} value={pr}>
              {PRIORITY_LABEL[pr]}
            </option>
          ))}
        </SelectNative>
        {clients.length > 0 ? (
          <SelectNative
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full lg:w-48"
            aria-label="Filter klien"
          >
            <option value="all">Semua klien</option>
            <option value="none">Tanpa klien</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </SelectNative>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Tidak ada proyek yang cocok.
          </p>
        ) : (
          filtered.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group block rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-md"
            >
              <div
                className="h-1.5 rounded-t-lg"
                style={{ backgroundColor: p.coverColor }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">
                      {p.code}
                    </p>
                    <h2 className="truncate font-semibold text-foreground group-hover:text-primary">
                      {p.name}
                    </h2>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {p.progress}%
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded bg-border/60 px-1.5 py-0.5 text-xs">
                    {PROJECT_STATUS_LABEL[p.status]}
                  </span>
                  {p.phase ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      {PROJECT_PHASE_LABEL[p.phase]}
                    </span>
                  ) : null}
                  <span className="rounded bg-border/60 px-1.5 py-0.5 text-xs">
                    {PRIORITY_LABEL[p.priority]}
                  </span>
                </div>
                {p.clientName ? (
                  <p className="mt-2 truncate text-sm text-muted-foreground">
                    {p.clientName}
                  </p>
                ) : null}
                {p.parentCode ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sub: {p.parentCode}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  {p.memberCount} anggota · diperbarui{' '}
                  {new Date(p.updatedAt).toLocaleDateString('id-ID')}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      {canManage ? (
        <ProjectFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          mode="create"
          project={null}
          clients={clients}
          parents={parents}
        />
      ) : null}
    </div>
  );
}
