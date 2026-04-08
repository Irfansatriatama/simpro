'use client';

import { Pencil, Trash2 } from 'lucide-react';
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {MEETING_TYPE_LABEL[meeting.type as keyof typeof MEETING_TYPE_LABEL] ??
              meeting.type}{' '}
            ·{' '}
            {MEETING_STATUS_LABEL[
              meeting.status as keyof typeof MEETING_STATUS_LABEL
            ] ?? meeting.status}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            {meeting.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {fmtWhen(meeting.date)}
            {meeting.startTime || meeting.endTime
              ? ` · ${meeting.startTime ?? '?'} – ${meeting.endTime ?? '?'}`
              : ''}
          </p>
          {meeting.location ? (
            <p className="mt-1 text-sm text-foreground">{meeting.location}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Dibuat oleh {meeting.creatorName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      {meeting.description ? (
        <section className="rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold text-foreground">Deskripsi</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {meeting.description}
          </p>
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-4 shadow-card">
        <h2 className="text-sm font-semibold text-foreground">Proyek terkait</h2>
        {projectLinks.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Tidak ada.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {projectLinks.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="text-primary hover:underline"
                >
                  <span className="font-mono text-xs">{p.code}</span> — {p.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-card">
        <h2 className="text-sm font-semibold text-foreground">Peserta</h2>
        {attendeeUsers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {attendeeUsers.map((u) => (
              <li
                key={u.id}
                className="rounded-md border border-border px-2 py-1 text-muted-foreground"
              >
                {u.name} (@{u.username})
              </li>
            ))}
          </ul>
        )}
      </section>

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
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={pending}
                    onChange={(e) => toggleAgenda(item.id, e.target.checked)}
                    className="mt-1 rounded border-border"
                    aria-label={`Selesai: ${item.text}`}
                  />
                  <span
                    className={
                      item.done ? 'text-muted-foreground line-through' : ''
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
          <h2 className="text-sm font-semibold text-foreground">Notulensi</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {meeting.notulensi}
          </p>
        </section>
      ) : null}

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
