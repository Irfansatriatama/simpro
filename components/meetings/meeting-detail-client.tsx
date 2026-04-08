'use client';

import { Calendar, Link2, MapPin, Pencil, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  deleteMeetingAction,
  toggleMeetingAgendaItemAction,
} from '@/app/actions/meetings';
import { Button } from '@/components/ui/button';
import {
  MEETING_STATUS_LABEL,
  MEETING_TYPE_LABEL,
} from '@/lib/meeting-constants';
import type {
  MeetingDetail,
  MeetingProjectPick,
  MeetingUserPick,
} from '@/lib/meeting-types';

import { MeetingFormDialog } from './meeting-form-dialog';

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function MeetingDetailClient(props: {
  meeting: MeetingDetail;
  projectLinks: MeetingProjectPick[];
  attendeeUsers: MeetingUserPick[];
  projects: MeetingProjectPick[];
  users: MeetingUserPick[];
}) {
  const {
    meeting,
    projectLinks,
    attendeeUsers,
    projects,
    users,
  } = props;
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleAgenda(itemId: string, done: boolean) {
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/meetings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Semua meetings
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {MEETING_TYPE_LABEL[
                      meeting.type as keyof typeof MEETING_TYPE_LABEL
                    ] ?? meeting.type}
                  </span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {MEETING_STATUS_LABEL[
                      meeting.status as keyof typeof MEETING_STATUS_LABEL
                    ] ?? meeting.status}
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-semibold text-foreground">
                  {meeting.title}
                </h1>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {fmtWhen(meeting.date)}
                      {meeting.startTime || meeting.endTime
                        ? ` · ${meeting.startTime ?? '?'} – ${meeting.endTime ?? '?'}`
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
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setFormOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={removeMeeting}
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </Button>
              </div>
            </div>
          </div>

          {meeting.description ? (
            <section className="rounded-lg border border-border bg-card p-4 shadow-card">
              <h2 className="text-sm font-semibold text-foreground">
                Agenda &amp; konteks
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {meeting.description}
              </p>
            </section>
          ) : null}

          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Agenda</h2>
            {meeting.agendaItems.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Kosong.</p>
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
                        disabled={pending}
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
          </section>

          {meeting.notulensi ? (
            <section className="rounded-lg border border-border bg-card p-4 shadow-card">
              <h2 className="text-sm font-semibold text-foreground">
                Notulensi
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {meeting.notulensi}
              </p>
            </section>
          ) : null}
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
                    className="rounded-md border border-border px-2.5 py-1.5 text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {u.name}
                    </span>
                    <span className="mt-0.5 block text-xs">
                      @{u.username}
                    </span>
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
        mode="edit"
        meeting={meeting}
        projects={projects}
        users={users}
      />
    </div>
  );
}
