'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  createMeetingAction,
  updateMeetingAction,
} from '@/app/actions/meetings';
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
  MEETING_STATUSES,
  MEETING_STATUS_LABEL,
  MEETING_TYPES,
  MEETING_TYPE_LABEL,
} from '@/lib/meeting-constants';
import type {
  MeetingDetail,
  MeetingProjectPick,
  MeetingUserPick,
} from '@/lib/meeting-types';

type Mode = 'create' | 'edit';

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MeetingFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  meeting: MeetingDetail | null;
  projects: MeetingProjectPick[];
  users: MeetingUserPick[];
}) {
  const { open, onOpenChange, mode, meeting, projects, users } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const projectSet = useMemo(
    () => new Set(meeting?.projectIds ?? []),
    [meeting?.projectIds],
  );
  const attendeeSet = useMemo(
    () => new Set(meeting?.attendeeIds ?? []),
    [meeting?.attendeeIds],
  );

  const agendaDefault = useMemo(
    () =>
      meeting?.agendaItems?.length
        ? meeting.agendaItems
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((i) => i.text)
            .join('\n')
        : '',
    [meeting?.agendaItems],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, mode, meeting?.id]);

  function onSubmit(formData: FormData) {
    setError(null);
    if (mode === 'edit' && meeting) {
      formData.set('meetingId', meeting.id);
    }
    startTransition(async () => {
      const action =
        mode === 'create' ? createMeetingAction : updateMeetingAction;
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
            {mode === 'create' ? 'Meeting baru' : 'Edit meeting'}
          </DialogTitle>
          <DialogDescription>
            Tautkan ke satu atau lebih proyek dan pilih peserta. Agenda: satu
            baris per poin (mengganti teks mengatur ulang item agenda).
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="mt-title">Judul</Label>
            <Input
              id="mt-title"
              name="title"
              required
              minLength={2}
              defaultValue={meeting?.title ?? ''}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="mt-type">Tipe</Label>
              <SelectNative
                id="mt-type"
                name="type"
                defaultValue={meeting?.type ?? 'internal'}
              >
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MEETING_TYPE_LABEL[t]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mt-status">Status</Label>
              <SelectNative
                id="mt-status"
                name="status"
                defaultValue={meeting?.status ?? 'scheduled'}
              >
                {MEETING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {MEETING_STATUS_LABEL[s]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mt-date">Tanggal & waktu</Label>
            <Input
              id="mt-date"
              name="date"
              type="datetime-local"
              required
              defaultValue={
                meeting?.date ? toDatetimeLocalValue(meeting.date) : ''
              }
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="mt-start">Mulai (teks, opsional)</Label>
              <Input
                id="mt-start"
                name="startTime"
                placeholder="09:00"
                defaultValue={meeting?.startTime ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mt-end">Selesai (teks, opsional)</Label>
              <Input
                id="mt-end"
                name="endTime"
                placeholder="10:00"
                defaultValue={meeting?.endTime ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mt-loc">Lokasi / tautan</Label>
            <Input
              id="mt-loc"
              name="location"
              placeholder="Ruang / Zoom / Meet"
              defaultValue={meeting?.location ?? ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mt-desc">Deskripsi</Label>
            <Textarea
              id="mt-desc"
              name="description"
              rows={2}
              defaultValue={meeting?.description ?? ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mt-notes">Notulensi</Label>
            <Textarea
              id="mt-notes"
              name="notulensi"
              rows={3}
              defaultValue={meeting?.notulensi ?? ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mt-agenda">Agenda (satu baris per poin)</Label>
            <Textarea
              id="mt-agenda"
              name="agenda"
              rows={4}
              placeholder="Pembukaan&#10;Update progres&#10;Risiko"
              defaultValue={agendaDefault}
            />
          </div>

          <fieldset className="grid gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium">Proyek terkait</legend>
            <div className="max-h-36 space-y-2 overflow-y-auto">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada proyek.</p>
              ) : (
                projects.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="projectIds"
                      value={p.id}
                      defaultChecked={projectSet.has(p.id)}
                      className="rounded border-border"
                    />
                    <span>
                      <span className="font-mono text-xs">{p.code}</span> —{' '}
                      {p.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </fieldset>

          <fieldset className="grid gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium">Peserta</legend>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="attendeeIds"
                    value={u.id}
                    defaultChecked={attendeeSet.has(u.id)}
                    className="rounded border-border"
                  />
                  <span>
                    {u.name} (@{u.username})
                  </span>
                </label>
              ))}
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
