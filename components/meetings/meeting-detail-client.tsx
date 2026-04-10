'use client';

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  Link2,
  Loader2,
  MapPin,
  Paperclip,
  Pencil,
  Plus,
  PlusCircle,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  addMeetingActionItemAction,
  addMeetingAttachmentAction,
  advanceMeetingStatusAction,
  createTaskFromMeetingActionItemAction,
  deleteMeetingAction,
  deleteMeetingActionItemAction,
  deleteMeetingAttachmentAction,
  toggleMeetingAgendaItemAction,
  updateMeetingNotulensiAction,
} from '@/app/actions/meetings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import { uploadToCloudinary } from '@/lib/cloudinary-client';
import {
  MEETING_TYPE_COLOR,
  meetingStatusLabel,
  meetingTypeLabel,
  normalizeMeetingStatus,
  type MeetingTypeValue,
} from '@/lib/meeting-constants';
import { formatMeetingDayTitle } from '@/lib/meeting-date';
import type {
  MeetingDetail,
  MeetingProjectPick,
  MeetingUserPick,
} from '@/lib/meeting-types';

import { MeetingFormDialog } from './meeting-form-dialog';

function fmtFileSize(n: number | null): string {
  if (n == null || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const NEXT_STATUS: Record<string, { key: string; label: string } | null> = {
  scheduled: { key: 'ongoing', label: 'Tandai berlangsung' },
  ongoing: { key: 'done', label: 'Tandai selesai' },
  done: null,
  cancelled: null,
  completed: null,
};

export function MeetingDetailClient(props: {
  meeting: MeetingDetail;
  projectLinks: MeetingProjectPick[];
  attendeeUsers: MeetingUserPick[];
  projects: MeetingProjectPick[];
  users: MeetingUserPick[];
  canManage: boolean;
  currentUserId: string;
}) {
  const {
    meeting,
    projectLinks,
    attendeeUsers,
    projects,
    users,
    canManage,
    currentUserId,
  } = props;
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notulensiDraft, setNotulensiDraft] = useState(
    meeting.notulensi ?? '',
  );
  const [actionText, setActionText] = useState('');
  const [actionAssignee, setActionAssignee] = useState('');
  const [actionDue, setActionDue] = useState('');
  const [attachBusy, setAttachBusy] = useState(false);

  useEffect(() => {
    setNotulensiDraft(meeting.notulensi ?? '');
  }, [meeting.notulensi]);

  const typeKey = (MEETING_TYPE_COLOR[meeting.type as MeetingTypeValue]
    ? meeting.type
    : 'other') as MeetingTypeValue;
  const typeColor = MEETING_TYPE_COLOR[typeKey] ?? '#64748B';
  const st = normalizeMeetingStatus(meeting.status);
  const nextSt = NEXT_STATUS[st];

  const isGuest =
    !canManage && meeting.createdBy !== currentUserId;

  function toggleAgenda(itemId: string, done: boolean) {
    if (!canManage) return;
    startTransition(async () => {
      const r = await toggleMeetingAgendaItemAction({
        meetingId: meeting.id,
        itemId,
        done,
      });
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  function removeMeeting() {
    if (!window.confirm(`Hapus meeting "${meeting.title}"?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('meetingId', meeting.id);
      const r = await deleteMeetingAction(fd);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      router.push('/meetings');
      router.refresh();
    });
  }

  function saveNotulensi() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('meetingId', meeting.id);
      fd.set('notulensi', notulensiDraft);
      const r = await updateMeetingNotulensiAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  function advanceStatus() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('meetingId', meeting.id);
      const r = await advanceMeetingStatusAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  async function onPickAttachment(file: File | null) {
    if (!file || !canManage) return;
    setAttachBusy(true);
    try {
      const { secureUrl, bytes } = await uploadToCloudinary(file, 'auto');
      const fd = new FormData();
      fd.set('meetingId', meeting.id);
      fd.set('url', secureUrl);
      fd.set('name', file.name);
      fd.set('size', String(bytes));
      fd.set('mimeType', file.type || '');
      const r = await addMeetingAttachmentAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Upload gagal.');
    } finally {
      setAttachBusy(false);
    }
  }

  function removeAttachment(id: string) {
    if (!window.confirm('Hapus lampiran ini?')) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('meetingId', meeting.id);
      fd.set('attachmentId', id);
      const r = await deleteMeetingAttachmentAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  function addActionItem() {
    if (!actionText.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('meetingId', meeting.id);
      fd.set('text', actionText.trim());
      if (actionAssignee) fd.set('assigneeId', actionAssignee);
      if (actionDue) fd.set('dueDate', actionDue);
      const r = await addMeetingActionItemAction(fd);
      if (!r.ok) window.alert(r.error);
      else {
        setActionText('');
        setActionAssignee('');
        setActionDue('');
        router.refresh();
      }
    });
  }

  function removeActionItem(id: string) {
    if (!window.confirm('Hapus action item ini?')) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('meetingId', meeting.id);
      fd.set('actionItemId', id);
      const r = await deleteMeetingActionItemAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  function createTaskFromAction(actionItemId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('meetingId', meeting.id);
      fd.set('actionItemId', actionItemId);
      const r = await createTaskFromMeetingActionItemAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  const userById = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <div className="page-enter space-y-6">
      <div>
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke meetings
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div
          className="h-1.5 w-full rounded-t-xl"
          style={{ background: typeColor }}
          aria-hidden
        />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                  style={{ background: typeColor }}
                >
                  {meetingTypeLabel(meeting.type)}
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                  {meetingStatusLabel(meeting.status)}
                </span>
                {isGuest ? (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    Tamu undangan
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
                {meeting.title}
              </h1>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p className="flex flex-wrap items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {formatMeetingDayTitle(meeting.dateKey)}
                    {meeting.startTime || meeting.endTime
                      ? ` · ${meeting.startTime ?? '—'} – ${meeting.endTime ?? '—'}`
                      : ''}
                  </span>
                </p>
                {meeting.location ? (
                  <p className="flex items-start gap-2 text-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    {meeting.location}
                  </p>
                ) : null}
              </div>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                {nextSt ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={advanceStatus}
                  >
                    {nextSt.label}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setFormOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={removeMeeting}
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          {meeting.description ? (
            <section className="rounded-lg border border-border bg-card p-4 shadow-card">
              <h2 className="text-sm font-semibold text-foreground">
                Deskripsi &amp; konteks
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {meeting.description}
              </p>
            </section>
          ) : null}

          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Agenda</h2>
            {meeting.agendaItems.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Belum ada poin.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {meeting.agendaItems
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={pending || !canManage}
                        onChange={(e) =>
                          toggleAgenda(item.id, e.target.checked)
                        }
                        className="mt-1 rounded border-border"
                        aria-label={`Selesai: ${item.text}`}
                      />
                      <span
                        className={
                          item.done
                            ? 'text-muted-foreground line-through'
                            : ''
                        }
                      >
                        {item.text}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
            {!canManage ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Hanya admin/PM yang dapat mencentang agenda.
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">
              Notulensi
            </h2>
            {canManage ? (
              <>
                <Textarea
                  className="mt-2 min-h-[120px]"
                  value={notulensiDraft}
                  onChange={(e) => setNotulensiDraft(e.target.value)}
                  placeholder="Ringkasan diskusi, keputusan, next steps…"
                />
                <Button
                  type="button"
                  size="sm"
                  className="mt-2"
                  disabled={pending}
                  onClick={saveNotulensi}
                >
                  Simpan notulensi
                </Button>
              </>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {meeting.notulensi?.trim()
                  ? meeting.notulensi
                  : 'Belum ada notulensi.'}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Lampiran
              </h2>
              {canManage ? (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="mtg-attach"
                    className="sr-only"
                    disabled={attachBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      void onPickAttachment(f ?? null);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={attachBusy}
                    className="gap-1.5"
                    onClick={() =>
                      document.getElementById('mtg-attach')?.click()
                    }
                  >
                    {attachBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Unggah
                  </Button>
                </div>
              ) : null}
            </div>
            {meeting.attachments.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Belum ada lampiran.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-md border border-border">
                {meeting.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
                  >
                    <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {a.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmtFileSize(a.size)}
                    </span>
                    <Button variant="ghost" size="sm" className="h-8" asChild>
                      <a href={a.url} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive"
                        onClick={() => removeAttachment(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">
              Action items
            </h2>
            {canManage ? (
              <div className="mt-3 grid gap-2 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-2">
                <div className="grid gap-1 sm:col-span-2">
                  <Label htmlFor="ai-text">Teks tugas</Label>
                  <Input
                    id="ai-text"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    placeholder="Mis. Perbarui dokumentasi API"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ai-user">Penanggung jawab</Label>
                  <SelectNative
                    id="ai-user"
                    value={actionAssignee}
                    onChange={(e) => setActionAssignee(e.target.value)}
                  >
                    <option value="">—</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ai-due">Jatuh tempo</Label>
                  <Input
                    id="ai-due"
                    type="date"
                    value={actionDue}
                    onChange={(e) => setActionDue(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="sm:col-span-2"
                  disabled={pending}
                  onClick={addActionItem}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Tambah action item
                </Button>
              </div>
            ) : null}
            {meeting.actionItems.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Belum ada action item.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {meeting.actionItems.map((ai) => {
                  const assignee = ai.assigneeId
                    ? userById[ai.assigneeId]
                    : null;
                  const converted = Boolean(ai.taskId);
                  return (
                    <li
                      key={ai.id}
                      className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{ai.text}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {assignee ? assignee.name : 'Belum ditugaskan'}
                          {ai.dueDate
                            ? ` · Jatuh tempo: ${new Date(ai.dueDate).toLocaleDateString('id-ID')}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {converted ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Tugas dibuat
                          </span>
                        ) : canManage ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={pending}
                            className="gap-1"
                            onClick={() => createTaskFromAction(ai.id)}
                          >
                            <PlusCircle className="h-4 w-4" />
                            Buat tugas
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Action item
                          </span>
                        )}
                        {canManage ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeActionItem(ai.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-72 lg:sticky lg:top-20">
          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              Peserta
            </h2>
            {attendeeUsers.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Belum ada.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {attendeeUsers.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
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
                    <div className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {u.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        @{u.username}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              Proyek terkait
            </h2>
            {projectLinks.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Tidak ada.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {projectLinks.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-primary hover:underline"
                    >
                      <span className="font-mono text-xs">{p.code}</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {p.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs text-muted-foreground">
            Dibuat oleh {meeting.creatorName}
          </p>
        </aside>
      </div>

      <MeetingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editMeetingId={formOpen ? meeting.id : null}
        defaultDateKey={meeting.dateKey}
        projects={projects}
        users={users}
      />
    </div>
  );
}
