'use client';

import { Plus, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';

import {
  createMeetingAction,
  getMeetingFormSnapshotAction,
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
import { cn } from '@/lib/utils';
import {
  MEETING_STATUSES,
  MEETING_STATUS_LABEL,
  MEETING_TYPES,
  MEETING_TYPE_LABEL,
  canonicalMeetingType,
  normalizeMeetingStatus,
} from '@/lib/meeting-constants';
import type {
  MeetingDetail,
  MeetingProjectPick,
  MeetingUserPick,
} from '@/lib/meeting-types';

type TabId = 'basic' | 'agenda' | 'people';

type AgendaRow = { id?: string; text: string };

export function MeetingFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMeetingId: string | null;
  defaultDateKey: string;
  projects: MeetingProjectPick[];
  users: MeetingUserPick[];
}) {
  const {
    open,
    onOpenChange,
    editMeetingId,
    defaultDateKey,
    projects,
    users,
  } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<MeetingDetail | null>(null);

  const mode = editMeetingId ? 'edit' : 'create';
  const meeting = snapshot;

  const [agendaRows, setAgendaRows] = useState<AgendaRow[]>([{ text: '' }]);

  useEffect(() => {
    if (!open) {
      setTab('basic');
      setSnapshot(null);
      setAgendaRows([{ text: '' }]);
      return;
    }
    if (!editMeetingId) {
      setSnapshot(null);
      setAgendaRows([{ text: '' }]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const s = await getMeetingFormSnapshotAction(editMeetingId);
      if (cancelled) return;
      setSnapshot(s);
      if (s?.agendaItems?.length) {
        setAgendaRows(
          s.agendaItems
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((i) => ({ id: i.id, text: i.text })),
        );
      } else {
        setAgendaRows([{ text: '' }]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editMeetingId]);

  const projectSet = useMemo(
    () => new Set(meeting?.projectIds ?? []),
    [meeting?.projectIds],
  );
  const attendeeSet = useMemo(
    () => new Set(meeting?.attendeeIds ?? []),
    [meeting?.attendeeIds],
  );

  const dateDefault = meeting?.dateKey ?? defaultDateKey;
  const statusDefault = meeting
    ? normalizeMeetingStatus(meeting.status)
    : 'scheduled';
  const typeDefault = meeting
    ? canonicalMeetingType(meeting.type)
    : 'internal';

  const buildAgendaJson = useCallback(() => {
    const baseItems = meeting?.agendaItems ?? [];
    const rows = agendaRows.map((r, idx) => {
      const text = r.text.trim();
      if (!text) return null;
      const existing = r.id
        ? baseItems.find((x) => x.id === r.id)
        : undefined;
      return {
        id: r.id,
        text,
        order: idx,
        done: existing?.done ?? false,
      };
    });
    return JSON.stringify(rows.filter(Boolean));
  }, [agendaRows, meeting?.agendaItems]);

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set('agendaJson', buildAgendaJson());
    if (mode === 'edit' && meeting) {
      fd.set('meetingId', meeting.id);
    }
    startTransition(async () => {
      const action =
        mode === 'create' ? createMeetingAction : updateMeetingAction;
      const r = await action(fd);
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
            Detail, agenda terstruktur, peserta, dan proyek — alur seperti Trackly.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Memuat data…
          </p>
        ) : mode === 'edit' && editMeetingId && !meeting ? (
          <p className="py-8 text-center text-sm text-destructive">
            Meeting tidak ditemukan atau Anda tidak punya akses mengubahnya.
          </p>
        ) : (
          <form onSubmit={submitForm} className="grid gap-4">
            <div
              className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1"
              role="tablist"
            >
              {(
                [
                  ['basic', 'Detail'],
                  ['agenda', 'Agenda'],
                  ['people', 'Peserta & proyek'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    tab === id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'basic' ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="mt-title">
                    Judul <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mt-title"
                    name="title"
                    required
                    minLength={2}
                    defaultValue={meeting?.title ?? ''}
                    placeholder="Judul meeting"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="mt-type">Tipe</Label>
                    <SelectNative
                      id="mt-type"
                      name="type"
                      defaultValue={typeDefault}
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
                      defaultValue={statusDefault}
                    >
                      {MEETING_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {MEETING_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                  <div className="grid gap-2 sm:col-span-1">
                    <Label htmlFor="mt-date">
                      Tanggal <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="mt-date"
                      name="date"
                      type="date"
                      required
                      defaultValue={dateDefault}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mt-start">Mulai</Label>
                    <Input
                      id="mt-start"
                      name="startTime"
                      type="time"
                      defaultValue={meeting?.startTime ?? '09:00'}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mt-end">Selesai</Label>
                    <Input
                      id="mt-end"
                      name="endTime"
                      type="time"
                      defaultValue={meeting?.endTime ?? '10:00'}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mt-loc">Lokasi / tautan</Label>
                  <Input
                    id="mt-loc"
                    name="location"
                    placeholder="Ruang atau URL video call"
                    defaultValue={meeting?.location ?? ''}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mt-desc">Deskripsi</Label>
                  <Textarea
                    id="mt-desc"
                    name="description"
                    rows={3}
                    placeholder="Konteks atau tujuan meeting"
                    defaultValue={meeting?.description ?? ''}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mt-notes">Notulensi (teks)</Label>
                  <Textarea
                    id="mt-notes"
                    name="notulensi"
                    rows={3}
                    defaultValue={meeting?.notulensi ?? ''}
                  />
                </div>
              </div>
            ) : null}

            {tab === 'agenda' ? (
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  Tambah poin agenda; urutan mengikuti daftar di bawah.
                </p>
                <div className="space-y-2">
                  {agendaRows.map((row, idx) => (
                    <div key={row.id ?? `new-${idx}`} className="flex gap-2">
                      <Input
                        value={row.text}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAgendaRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, text: v } : r,
                            ),
                          );
                        }}
                        placeholder={`Agenda ${idx + 1}…`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        aria-label="Hapus baris"
                        onClick={() =>
                          setAgendaRows((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-1"
                  onClick={() =>
                    setAgendaRows((prev) => [...prev, { text: '' }])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Tambah poin
                </Button>
              </div>
            ) : null}

            {tab === 'people' ? (
              <div className="grid gap-4">
                <fieldset className="grid gap-2 rounded-md border border-border p-3">
                  <legend className="px-1 text-sm font-medium">Peserta</legend>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
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
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-semibold">
                            {u.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={u.image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              u.name.slice(0, 2).toUpperCase()
                            )}
                          </span>
                          <span className="truncate">
                            {u.name} (@{u.username})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="grid gap-2 rounded-md border border-border p-3">
                  <legend className="px-1 text-sm font-medium">
                    Proyek terkait
                  </legend>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {projects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Tidak ada proyek.
                      </p>
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
                            <span className="font-mono text-xs">{p.code}</span>{' '}
                            — {p.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </fieldset>
              </div>
            ) : null}

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
              <Button type="submit" disabled={pending} className="gap-2">
                <Save className="h-4 w-4" />
                {pending
                  ? 'Menyimpan…'
                  : mode === 'create'
                    ? 'Buat meeting'
                    : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
