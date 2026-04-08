'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  createSprintAction,
  updateSprintAction,
} from '@/app/actions/sprints';
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
  isSprintStatus,
  SPRINT_STATUSES,
  SPRINT_STATUS_LABEL,
} from '@/lib/sprint-constants';
import type { SprintRow } from '@/lib/sprint-types';

type Mode = 'create' | 'edit';

export function SprintFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  projectId: string;
  sprint: SprintRow | null;
}) {
  const { open, onOpenChange, mode, projectId, sprint } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, mode, sprint?.id]);

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set('projectId', projectId);
    if (mode === 'edit' && sprint) {
      formData.set('sprintId', sprint.id);
    }
    startTransition(async () => {
      const action =
        mode === 'create' ? createSprintAction : updateSprintAction;
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Sprint baru' : 'Edit sprint'}
          </DialogTitle>
          <DialogDescription>
            Nama, tujuan, rentang tanggal, dan status. Tugas tetap di backlog
            dapat ditautkan ke sprint ini.
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sp-name">Nama sprint</Label>
            <Input
              id="sp-name"
              name="name"
              required
              minLength={2}
              defaultValue={sprint?.name ?? ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sp-goal">Tujuan / goal</Label>
            <Textarea
              id="sp-goal"
              name="goal"
              rows={2}
              placeholder="Opsional"
              defaultValue={sprint?.goal ?? ''}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="sp-start">Mulai</Label>
              <Input
                id="sp-start"
                name="startDate"
                type="date"
                defaultValue={sprint?.startDate ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sp-end">Selesai (rencana)</Label>
              <Input
                id="sp-end"
                name="endDate"
                type="date"
                defaultValue={sprint?.endDate ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sp-status">Status</Label>
            <SelectNative
              id="sp-status"
              name="status"
              defaultValue={sprint?.status ?? 'planning'}
            >
              {sprint && !isSprintStatus(sprint.status) ? (
                <option value={sprint.status}>{sprint.status}</option>
              ) : null}
              {SPRINT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SPRINT_STATUS_LABEL[s]}
                </option>
              ))}
            </SelectNative>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sp-retro">Catatan retrospektif</Label>
            <Textarea
              id="sp-retro"
              name="retro"
              rows={3}
              placeholder="Opsional, isi setelah sprint selesai"
              defaultValue={sprint?.retro ?? ''}
            />
          </div>

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
