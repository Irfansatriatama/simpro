'use client';

import { deleteProjectAction } from '@/app/actions/projects';
import {
  Filter,
  FolderPlus,
  ChevronDown,
  Plus,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import {
  PROJECT_PHASE_LABEL,
  PROJECT_STATUS_LABEL,
} from '@/lib/project-labels';
import type { ProjectDetailPayload, ProjectListRow } from '@/lib/project-types';
import { cn } from '@/lib/utils';
import { ProjectPhase, ProjectStatus } from '@prisma/client';

import { ProjectFormDialog } from './project-form-dialog';
import { ProjectListCard } from './project-list-card';

type ClientOpt = { id: string; companyName: string };
type ParentOpt = { id: string; code: string; name: string };

function toFormProject(p: ProjectListRow): ProjectDetailPayload['project'] {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    status: p.status,
    phase: p.phase,
    priority: p.priority,
    progress: p.progress,
    coverColor: p.coverColor,
    budget: p.budget,
    actualCost: p.actualCost,
    tags: p.tags,
    clientId: p.clientId,
    clientName: p.clientName,
    parentId: p.parentId,
    parentCode: p.parentCode,
    startDate: p.startDate,
    endDate: p.endDate,
    actualEndDate: p.actualEndDate,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    subProjectCount: 0,
  };
}

export function ProjectsClient(props: {
  projects: ProjectListRow[];
  canManage: boolean;
  clients: ClientOpt[];
  parents: ParentOpt[];
}) {
  const { projects, canManage, clients, parents } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ProjectStatus>('');
  const [phaseFilter, setPhaseFilter] = useState<'' | ProjectPhase>('');
  const [clientFilter, setClientFilter] = useState<string>('');

  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'' | ProjectStatus>('');
  const [draftPhase, setDraftPhase] = useState<'' | ProjectPhase>('');
  const [draftClient, setDraftClient] = useState<string>('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editProject, setEditProject] = useState<ProjectListRow | null>(
    null,
  );

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const openFilterModal = () => {
    setDraftStatus(statusFilter);
    setDraftPhase(phaseFilter);
    setDraftClient(clientFilter);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setStatusFilter(draftStatus);
    setPhaseFilter(draftPhase);
    setClientFilter(draftClient);
    setFilterOpen(false);
  };

  const resetFilter = () => {
    setDraftStatus('');
    setDraftPhase('');
    setDraftClient('');
    setStatusFilter('');
    setPhaseFilter('');
    setClientFilter('');
    setFilterOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter) n++;
    if (phaseFilter) n++;
    if (clientFilter) n++;
    return n;
  }, [statusFilter, phaseFilter, clientFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const blob = `${p.code} ${p.name} ${p.description ?? ''} ${p.clientName ?? ''} ${p.tags?.join(' ') ?? ''}`.toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchS = !statusFilter || p.status === statusFilter;
      const matchPh = !phaseFilter || p.phase === phaseFilter;
      const matchC = !clientFilter || p.clientId === clientFilter;
      return matchQ && matchS && matchPh && matchC;
    });
  }, [projects, search, statusFilter, phaseFilter, clientFilter]);

  const idSet = useMemo(() => new Set(filtered.map((p) => p.id)), [filtered]);

  const roots = useMemo(
    () =>
      filtered.filter((p) => !p.parentId || !idSet.has(p.parentId)),
    [filtered, idSet],
  );

  const childrenOf = useCallback(
    (parentId: string) => filtered.filter((c) => c.parentId === parentId),
    [filtered],
  );

  function onEdit(p: ProjectListRow) {
    setFormMode('edit');
    setEditProject(p);
    setFormOpen(true);
  }

  function onDelete(p: ProjectListRow) {
    if (
      !window.confirm(
        `Hapus proyek "${p.name}"? Sub-proyek akan dilepas dari induk (bukan dihapus).`,
      )
    )
      return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', p.id);
      const r = await deleteProjectAction(fd);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  function renderChips() {
    const chips: {
      key: string;
      label: string;
      onRemove: () => void;
    }[] = [];
    if (statusFilter) {
      chips.push({
        key: 'status',
        label: `Status: ${PROJECT_STATUS_LABEL[statusFilter]}`,
        onRemove: () => setStatusFilter(''),
      });
    }
    if (phaseFilter) {
      chips.push({
        key: 'phase',
        label: `Fase: ${PROJECT_PHASE_LABEL[phaseFilter]}`,
        onRemove: () => setPhaseFilter(''),
      });
    }
    if (clientFilter) {
      const name =
        clients.find((c) => c.id === clientFilter)?.companyName ?? clientFilter;
      chips.push({
        key: 'client',
        label: `Klien: ${name}`,
        onRemove: () => setClientFilter(''),
      });
    }
    if (chips.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.key}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs"
          >
            <span>{c.label}</span>
            <button
              type="button"
              className="rounded-full px-1 hover:bg-border/80"
              aria-label="Hapus filter"
              onClick={c.onRemove}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    );
  }

  function renderNode(p: ProjectListRow): React.ReactNode {
    const subs = childrenOf(p.id);
    const hasSubs = subs.length > 0;
    const isCollapsed = collapsed.has(p.id);

    return (
      <div key={p.id} className="project-group">
        <div className="flex gap-1">
          {hasSubs ? (
            <button
              type="button"
              className="mt-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted/60"
              aria-expanded={!isCollapsed}
              aria-label="Tampilkan atau sembunyikan sub-proyek"
              onClick={() => toggleCollapsed(p.id)}
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isCollapsed && '-rotate-90',
                )}
              />
            </button>
          ) : (
            <span className="w-8 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 max-w-md flex-1">
            <ProjectListCard
              project={p}
              canManage={canManage}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
        {hasSubs && !isCollapsed ? (
          <div className="ml-4 mt-3 space-y-3 border-l border-border/80 pl-3 sm:ml-8">
            {subs.map((c) => renderNode(c))}
          </div>
        ) : null}
      </div>
    );
  }

  const orphanRoots = roots;
  const showEmptyCreate =
    projects.length === 0 && canManage && activeFilterCount === 0 && !search;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Proyek</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola semua proyek dan pantau progresnya.
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            onClick={() => {
              setFormMode('create');
              setEditProject(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Proyek baru
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode, atau klien…"
            className="pl-9"
            aria-label="Cari proyek"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative inline-flex">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={openFilterModal}
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            {activeFilterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {renderChips()}

      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <FolderPlus className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              {projects.length === 0
                ? 'Belum ada proyek'
                : 'Tidak ada proyek yang cocok'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {projects.length === 0
                ? 'Buat proyek pertama untuk memulai.'
                : 'Sesuaikan pencarian atau filter.'}
            </p>
            {showEmptyCreate ? (
              <Button
                type="button"
                className="mt-4 gap-2"
                onClick={() => {
                  setFormMode('create');
                  setEditProject(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Proyek baru
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {orphanRoots.map((r) => (
              <div key={r.id} className="min-w-0 w-full max-w-md flex-[1_1_320px]">
                {renderNode(r)}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter proyek</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="flt-status">Status</Label>
              <SelectNative
                id="flt-status"
                value={draftStatus}
                onChange={(e) =>
                  setDraftStatus((e.target.value || '') as '' | ProjectStatus)
                }
              >
                <option value="">Semua status</option>
                {Object.values(ProjectStatus).map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABEL[s]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="flt-phase">Fase</Label>
              <SelectNative
                id="flt-phase"
                value={draftPhase}
                onChange={(e) =>
                  setDraftPhase((e.target.value || '') as '' | ProjectPhase)
                }
              >
                <option value="">Semua fase</option>
                {Object.values(ProjectPhase).map((ph) => (
                  <option key={ph} value={ph}>
                    {PROJECT_PHASE_LABEL[ph]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="flt-client">Klien</Label>
              <SelectNative
                id="flt-client"
                value={draftClient}
                onChange={(e) => setDraftClient(e.target.value)}
              >
                <option value="">Semua klien</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={resetFilter}>
              Reset
            </Button>
            <Button type="button" onClick={applyFilter}>
              Terapkan filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canManage ? (
        <ProjectFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          mode={formMode}
          project={
            formMode === 'edit' && editProject
              ? toFormProject(editProject)
              : null
          }
          clients={clients}
          parents={parents.filter((x) => x.id !== editProject?.id)}
        />
      ) : null}
    </div>
  );
}
