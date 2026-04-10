'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  createMaintenanceAction,
  updateMaintenanceAction,
} from '@/app/actions/maintenance';
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
  MAIN_PIPELINE_MAINTENANCE_STATUSES,
  PARKING_LOT_MAINTENANCE_STATUSES,
} from '@/lib/maintenance-board';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
  SEVERITY_LABEL,
} from '@/lib/maintenance-labels';
import type { MaintenanceRow } from '@/lib/maintenance-types';
import { PRIORITY_LABEL } from '@/lib/project-labels';
import type { ProjectMemberPick } from '@/lib/backlog-types';
import { MaintenanceStatus, MaintenanceType, Priority, Severity } from '@prisma/client';

type Mode = 'create' | 'edit';

function dateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function MaintenanceFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  projectId: string;
  members: ProjectMemberPick[];
  row: MaintenanceRow | null;
}) {
  const { open, onOpenChange, mode, projectId, members, row } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const picSet = useMemo(() => {
    const s = new Set<string>();
    if (row) {
      for (const p of row.picDevs) s.add(p.userId);
    }
    return s;
  }, [row]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, mode, row?.id]);

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set('projectId', projectId);
    if (mode === 'edit' && row) {
      formData.set('maintenanceId', row.id);
    }
    startTransition(async () => {
      const action =
        mode === 'create'
          ? createMaintenanceAction
          : updateMaintenanceAction;
      const r = await action(formData);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tiket maintenance baru' : 'Edit tiket'}
          </DialogTitle>
          <DialogDescription>
            Pencatatan permintaan perbaikan / penyesuaian pasca go-live. PIC
            developer harus anggota proyek.
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="m-title">Judul</Label>
            <Input
              id="m-title"
              name="title"
              required
              minLength={2}
              defaultValue={row?.title ?? ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="m-desc">Deskripsi</Label>
            <Textarea
              id="m-desc"
              name="description"
              rows={3}
              defaultValue={row?.description ?? ''}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="m-type">Tipe</Label>
              <SelectNative
                id="m-type"
                name="type"
                defaultValue={row?.type ?? MaintenanceType.bug}
              >
                {Object.values(MaintenanceType).map((t) => (
                  <option key={t} value={t}>
                    {MAINTENANCE_TYPE_LABEL[t]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-prio">Prioritas</Label>
              <SelectNative
                id="m-prio"
                name="priority"
                defaultValue={row?.priority ?? Priority.medium}
              >
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-status">Status</Label>
              <SelectNative
                id="m-status"
                name="status"
                defaultValue={row?.status ?? MaintenanceStatus.backlog}
              >
                <optgroup label="Saluran utama">
                  {MAIN_PIPELINE_MAINTENANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {MAINTENANCE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Parkir">
                  {PARKING_LOT_MAINTENANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {MAINTENANCE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </optgroup>
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-sev">Severity</Label>
              <SelectNative id="m-sev" name="severity" defaultValue={row?.severity ?? ''}>
                <option value="">— Tidak diisi —</option>
                {Object.values(Severity).map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="m-reported-by">Dilaporkan oleh (teks)</Label>
              <Input
                id="m-reported-by"
                name="reportedBy"
                placeholder="Nama / divisi klien"
                defaultValue={row?.reportedBy ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-reported-date">Tanggal lapor</Label>
              <Input
                id="m-reported-date"
                name="reportedDate"
                type="date"
                defaultValue={dateInputValue(row?.reportedDate ?? null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-due">Jatuh tempo</Label>
              <Input
                id="m-due"
                name="dueDate"
                type="date"
                defaultValue={dateInputValue(row?.dueDate ?? null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-resolved">Tanggal selesai (opsional)</Label>
              <Input
                id="m-resolved"
                name="resolvedDate"
                type="date"
                defaultValue={dateInputValue(row?.resolvedDate ?? null)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="m-ordered">Dipesan oleh</Label>
              <Input
                id="m-ordered"
                name="orderedBy"
                defaultValue={row?.orderedBy ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-pic-client">PIC klien</Label>
              <Input
                id="m-pic-client"
                name="picClient"
                defaultValue={row?.picClient ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="m-est">Perkiraan jam</Label>
              <Input
                id="m-est"
                name="estimatedHours"
                type="number"
                step="0.25"
                min={0}
                placeholder="—"
                defaultValue={row?.estimatedHours ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-act">Aktual jam</Label>
              <Input
                id="m-act"
                name="actualHours"
                type="number"
                step="0.25"
                min={0}
                placeholder="—"
                defaultValue={row?.actualHours ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-cost">Estimasi biaya</Label>
              <Input
                id="m-cost"
                name="costEstimate"
                type="number"
                step="0.01"
                min={0}
                placeholder="—"
                defaultValue={row?.costEstimate ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="m-notes">Catatan</Label>
            <Textarea
              id="m-notes"
              name="notes"
              rows={2}
              defaultValue={row?.notes ?? ''}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-res-notes">Catatan penyelesaian</Label>
            <Textarea
              id="m-res-notes"
              name="resolutionNotes"
              rows={2}
              defaultValue={row?.resolutionNotes ?? ''}
            />
          </div>

          <fieldset className="grid gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium text-foreground">
              PIC developer
            </legend>
            <div className="max-h-32 space-y-2 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada anggota proyek.
                </p>
              ) : (
                members.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="picDevIds"
                      value={m.id}
                      defaultChecked={picSet.has(m.id)}
                      className="rounded border-border"
                    />
                    <span>
                      {m.name} (@{m.username})
                    </span>
                  </label>
                ))
              )}
            </div>
          </fieldset>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Menyimpan…' : mode === 'create' ? 'Buat' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
