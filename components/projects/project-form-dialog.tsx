'use client';

import { Priority, ProjectPhase, ProjectStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  createProjectAction,
  updateProjectAction,
} from '@/app/actions/projects';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import {
  PRIORITY_LABEL,
  PROJECT_PHASE_LABEL,
  PROJECT_STATUS_LABEL,
} from '@/lib/project-labels';
import type { ProjectDetailPayload } from '@/lib/project-types';

type Mode = 'create' | 'edit';

type ClientOpt = { id: string; companyName: string };
type ParentOpt = { id: string; code: string; name: string };

export function ProjectFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  project: ProjectDetailPayload['project'] | null;
  clients: ClientOpt[];
  parents: ParentOpt[];
}) {
  const { open, onOpenChange, mode, project, clients, parents } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, mode, project?.id]);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const action =
        mode === 'create' ? createProjectAction : updateProjectAction;
      if (mode === 'edit' && project) {
        formData.set('id', project.id);
      }
      const r = await action(formData);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const p = project;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Proyek baru' : 'Edit proyek'}
          </DialogTitle>
          <DialogDescription>
            Kode unik dipakai di URL internal dan laporan. Pembuat otomatis
            menjadi anggota dengan peran PM.
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-code">Kode proyek</Label>
              <Input
                id="p-code"
                name="code"
                required
                placeholder="PRJ-ALPHA"
                defaultValue={p?.code ?? ''}
                className="font-mono uppercase"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-name">Nama</Label>
              <Input
                id="p-name"
                name="name"
                required
                minLength={2}
                defaultValue={p?.name ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="p-desc">Deskripsi</Label>
            <Textarea
              id="p-desc"
              name="description"
              rows={3}
              defaultValue={p?.description ?? ''}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-status">Status</Label>
              <SelectNative
                id="p-status"
                name="status"
                required
                defaultValue={p?.status ?? ProjectStatus.planning}
              >
                {Object.values(ProjectStatus).map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABEL[s]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-phase">Fase</Label>
              <SelectNative
                id="p-phase"
                name="phase"
                defaultValue={p?.phase ?? ''}
              >
                <option value="">—</option>
                {Object.values(ProjectPhase).map((ph) => (
                  <option key={ph} value={ph}>
                    {PROJECT_PHASE_LABEL[ph]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-priority">Prioritas</Label>
              <SelectNative
                id="p-priority"
                name="priority"
                required
                defaultValue={p?.priority ?? Priority.medium}
              >
                {Object.values(Priority).map((pr) => (
                  <option key={pr} value={pr}>
                    {PRIORITY_LABEL[pr]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-client">Klien</Label>
              <SelectNative
                id="p-client"
                name="clientId"
                defaultValue={p?.clientId ?? ''}
              >
                <option value="">— Tanpa klien —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-parent">Sub-proyek dari</Label>
              <SelectNative
                id="p-parent"
                name="parentId"
                defaultValue={p?.parentId ?? ''}
              >
                <option value="">— Tidak ada —</option>
                {parents.map((par) => (
                  <option key={par.id} value={par.id}>
                    {par.code} — {par.name}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-start">Mulai</Label>
              <Input
                id="p-start"
                name="startDate"
                type="date"
                defaultValue={
                  p?.startDate ? p.startDate.slice(0, 10) : ''
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-end">Selesai (rencana)</Label>
              <Input
                id="p-end"
                name="endDate"
                type="date"
                defaultValue={p?.endDate ? p.endDate.slice(0, 10) : ''}
              />
            </div>
          </div>

          {mode === 'edit' && p ? (
            <div className="grid gap-2">
              <Label htmlFor="p-actual-end">Selesai (aktual)</Label>
              <Input
                id="p-actual-end"
                name="actualEndDate"
                type="date"
                defaultValue={
                  p.actualEndDate ? p.actualEndDate.slice(0, 10) : ''
                }
              />
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-budget">Anggaran</Label>
              <Input
                id="p-budget"
                name="budget"
                type="number"
                min={0}
                step="0.01"
                defaultValue={p?.budget ?? 0}
              />
            </div>
            {mode === 'edit' && p ? (
              <div className="grid gap-2">
                <Label htmlFor="p-cost">Biaya aktual</Label>
                <Input
                  id="p-cost"
                  name="actualCost"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={p.actualCost ?? 0}
                />
              </div>
            ) : null}
          </div>

          {mode === 'edit' && p ? (
            <div className="grid gap-2">
              <Label htmlFor="p-progress">Progres (%)</Label>
              <Input
                id="p-progress"
                name="progress"
                type="number"
                min={0}
                max={100}
                defaultValue={p.progress}
              />
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-tags">Tag (koma)</Label>
              <Input
                id="p-tags"
                name="tags"
                placeholder="web, internal, …"
                defaultValue={p?.tags?.join(', ') ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-color">Warna sampul</Label>
              <Input
                id="p-color"
                name="coverColor"
                type="color"
                defaultValue={p?.coverColor ?? '#2563eb'}
                className="h-10 w-full cursor-pointer"
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? 'Menyimpan…'
                : mode === 'create'
                  ? 'Buat proyek'
                  : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
