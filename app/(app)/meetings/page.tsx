import { MeetingsClient } from '@/components/meetings/meetings-client';
import {
  meetingListWhere,
  requireMeetingsSession,
} from '@/lib/meeting-access';
import { meetingDateKeyFromIso } from '@/lib/meeting-date';
import type {
  MeetingListRow,
  MeetingProjectPick,
  MeetingUserPick,
} from '@/lib/meeting-types';
import { prisma } from '@/lib/prisma';
import { UserStatus } from '@prisma/client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MeetingsPage() {
  const ctx = await requireMeetingsSession();
  if (!ctx) redirect('/login');

  const where = meetingListWhere(ctx.userId, ctx.isManagement);

  const [meetingsRaw, projectsRaw, usersRaw] = await Promise.all([
    prisma.meeting.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 400,
      include: {
        creator: { select: { name: true } },
        projects: {
          include: { project: { select: { code: true } } },
        },
        attendees: {
          take: 6,
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        agendaItems: { select: { done: true } },
        _count: { select: { attendees: true } },
      },
    }),
    prisma.project.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    }),
    prisma.user.findMany({
      where: { status: UserStatus.active },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true, email: true, image: true },
    }),
  ]);

  const rows: MeetingListRow[] = meetingsRaw.map((m) => {
    const iso = m.date.toISOString();
    const agendaTotal = m.agendaItems.length;
    const agendaDone = m.agendaItems.filter((a) => a.done).length;
    return {
      id: m.id,
      title: m.title,
      type: m.type,
      status: m.status,
      date: iso,
      dateKey: meetingDateKeyFromIso(iso),
      startTime: m.startTime,
      endTime: m.endTime,
      location: m.location,
      creatorName: m.creator.name,
      projectCodes: m.projects.map((mp) => mp.project.code).join(', '),
      attendeeCount: m._count.attendees,
      agendaDone,
      agendaTotal,
      attendeePreview: m.attendees.map((a) => ({
        id: a.user.id,
        name: a.user.name,
        image: a.user.image,
      })),
    };
  });

  const projects: MeetingProjectPick[] = projectsRaw;
  const users: MeetingUserPick[] = usersRaw;

  return (
    <MeetingsClient
      rows={rows}
      projects={projects}
      users={users}
      canManage={ctx.isManagement}
    />
  );
}
