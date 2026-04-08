'use client';

import { Priority, TaskStatus, TaskType } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { createTaskAction, updateTaskAction } from '@/app/actions/tasks';
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
import type {
  BacklogTaskRow,
  EpicPick,
  ProjectMemberPick,
  SprintPick,
} from '@/lib/backlog-types';
import { PRIORITY_LABEL, TASK_STATUS_LABEL, TASK_TYPE_LABEL } from '@/lib/task-labels';

type Mode = 'create' | 'edit';

type DepPick = { id: string; title: string };

export function TaskFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  projectId: string;
  task: BacklogTaskRow | null;
  assigneeMembers: ProjectMemberPick[];
  reporterMembers: ProjectMemberPick[];
  sprints: SprintPick[];
  epics: EpicPick[];
  dependencyOptions: DepPick[];
  canEdit: boolean;
  /** Untuk mode create: pelapor default (biasanya pengguna saat ini). */
  defaultReporterId: string;
}) {
  const {
    open,
    onOpenChange,
    mode,
    projectId,
    task,
    assigneeMembers,
    reporterMembers,
    sprints,
    epics,
    dependencyOptions,
    canEdit,
    defaultReporterId,
  } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, mode, task?.id]);

  if (!canEdit) return null;

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set('projectId', projectId);
    if (mode === 'edit' && task) {
      formData.set('taskId', task.id);
    }
    startTransition(async () => {
      const action =
        mode === 'create' ? createTaskAction : updateTaskAction;
      const r = await action(formData);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const t = task;
  const assigneeSet = new Set(t?.assignees.map((a) => a.userId) ?? []);
  const depSet = new Set(t?.dependsOn.map((d) => d.id) ?? []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tugas baru' : 'Edit tugas'}
          </DialogTitle>
          <DialogDescription>
            Penerima tugas dan dependensi harus dari anggota / tugas proyek ini.
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-2">
            <Label htmlFor="t-title">Judul</Label>
            <Input
              id="t-title"
              name="title"
              required
              minLength={2}
              defaultValue={t?.title ?? ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="t-desc">Deskripsi</Label>
            <Textarea
              id="t-desc"
              name="description"
              rows={4}
              defaultValue={t?.description ?? ''}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="t-type">Tipe</Label>
              <SelectNative
                id="t-type"
                name="type"
                required
                defaultValue={t?.type ?? TaskType.task}
              >
                {Object.values(TaskType).map((ty) => (
                  <option key={ty} value={ty}>
                    {TASK_TYPE_LABEL[ty]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-status">Status</Label>
              <SelectNative
                id="t-status"
                name="status"
                required
                defaultValue={t?.status ?? TaskStatus.backlog}
              >
                {Object.values(TaskStatus).map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABEL[s]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-priority">Prioritas</Label>
              <SelectNative
                id="t-priority"
                name="priority"
                required
                defaultValue={t?.priority ?? Priority.medium}
              >
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="t-sprint">Sprint</Label>
              <SelectNative
                id="t-sprint"
                name="sprintId"
                defaultValue={t?.sprintId ?? ''}
              >
                <option value="">— Backlog sprint —</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-epic">Epic</Label>
              <SelectNative
                id="t-epic"
                name="epicId"
                defaultValue={t?.epicId ?? ''}
              >
                <option value="">— Tanpa epic —</option>
                {epics.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="t-sp">Story points</Label>
              <Input
                id="t-sp"
                name="storyPoints"
                type="number"
                min={0}
                placeholder="Kosongkan jika tidak dipakai"
                defaultValue={t?.storyPoints ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-time">Waktu tercatat (menit)</Label>
              <Input
                id="t-time"
                name="timeLogged"
                type="number"
                min={0}
                defaultValue={t?.timeLogged ?? 0}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="t-reporter">Pelapor</Label>
            <SelectNative
              id="t-reporter"
              name="reporterId"
              required
              defaultValue={t?.reporterId ?? defaultReporterId}
            >
              {reporterMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (@{m.username})
                </option>
              ))}
            </SelectNative>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="t-start">Mulai</Label>
              <Input
                id="t-start"
                name="startDate"
                type="date"
                defaultValue={
                  t?.startDate ? t.startDate.slice(0, 10) : ''
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-due">Jatuh tempo</Label>
              <Input
                id="t-due"
                name="dueDate"
                type="date"
                defaultValue={t?.dueDate ? t.dueDate.slice(0, 10) : ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-done">Selesai</Label>
              <Input
                id="t-done"
                name="completedAt"
                type="date"
                defaultValue={
                  t?.completedAt ? t.completedAt.slice(0, 10) : ''
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="t-tags">Tag (koma)</Label>
            <Input
              id="t-tags"
              name="tags"
              defaultValue={t?.tags?.join(', ') ?? ''}
            />
          </div>

          <fieldset className="grid gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium text-foreground">
              Penerima tugas
            </legend>
            <div className="max-h-32 space-y-2 overflow-y-auto">
              {assigneeMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada anggota proyek.
                </p>
              ) : (
                assigneeMembers.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="assigneeIds"
                      value={m.id}
                      defaultChecked={assigneeSet.has(m.id)}
                      className="rounded border-border"
                    />
                    <span>
                      {m.name}{' '}
                      <span className="text-muted-foreground">
                        (@{m.username})
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="t-deps">Bergantung pada (harus selesai dulu)</Label>
            <select
              id="t-deps"
              name="dependencyIds"
              multiple
              size={6}
              className="flex w-full rounded-md border border-border bg-card px-2 py-1 text-sm"
              defaultValue={t ? Array.from(depSet) : []}
            >
              {dependencyOptions
                .filter((o) => mode === 'create' || o.id !== t?.id)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title.length > 70 ? `${o.title.slice(0, 70)}…` : o.title}
                  </option>
                ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Ctrl/Cmd + klik untuk pilih banyak.
            </p>
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
                  ? 'Buat tugas'
                  : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
