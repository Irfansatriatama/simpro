import { MeetingDetailClient } from '@/components/meetings/meeting-detail-client';
import {
  canViewMeeting,
  requireMeetingsSession,
} from '@/lib/meeting-access';
import { meetingDateKeyFromIso } from '@/lib/meeting-date';
import type {
  MeetingDetail,
  MeetingProjectPick,
  MeetingUserPick,
} from '@/lib/meeting-types';
import { prisma } from '@/lib/prisma';
import { UserStatus } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await requireMeetingsSession();
  if (!ctx) redirect('/login');

  const allowed = await canViewMeeting(params.id, ctx.userId, ctx.role);
  if (!allowed) redirect('/meetings');

  const [meetingRaw, projectsRaw, usersRaw] = await Promise.all([
    prisma.meeting.findUnique({
      where: { id: params.id },
      include: {
        creator: { select: { name: true } },
        projects: {
          include: {
            project: { select: { id: true, code: true, name: true } },
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                image: true,
              },
            },
          },
        },
        agendaItems: { orderBy: { order: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
        actionItems: { orderBy: { id: 'asc' } },
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

  if (!meetingRaw) notFound();

  const iso = meetingRaw.date.toISOString();

  const meeting: MeetingDetail = {
    id: meetingRaw.id,
    title: meetingRaw.title,
    description: meetingRaw.description,
    type: meetingRaw.type,
    date: iso,
    dateKey: meetingDateKeyFromIso(iso),
    startTime: meetingRaw.startTime,
    endTime: meetingRaw.endTime,
    location: meetingRaw.location,
    status: meetingRaw.status,
    notulensi: meetingRaw.notulensi,
    createdBy: meetingRaw.createdBy,
    creatorName: meetingRaw.creator.name,
    projectIds: meetingRaw.projects.map((mp) => mp.projectId),
    attendeeIds: meetingRaw.attendees.map((a) => a.userId),
    agendaItems: meetingRaw.agendaItems.map((a) => ({
      id: a.id,
      text: a.text,
      done: a.done,
      order: a.order,
    })),
    attachments: meetingRaw.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      size: a.size,
      mimeType: a.mimeType,
    })),
    actionItems: meetingRaw.actionItems.map((a) => ({
      id: a.id,
      text: a.text,
      assigneeId: a.assigneeId,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
      taskId: a.taskId,
    })),
  };

  const projectLinks: MeetingProjectPick[] = meetingRaw.projects.map(
    (mp) => mp.project,
  );
  const attendeeUsers: MeetingUserPick[] = meetingRaw.attendees.map(
    (a) => ({
      id: a.user.id,
      name: a.user.name,
      username: a.user.username,
      email: a.user.email,
      image: a.user.image,
    }),
  );

  return (
    <MeetingDetailClient
      meeting={meeting}
      projectLinks={projectLinks}
      attendeeUsers={attendeeUsers}
      projects={projectsRaw}
      users={usersRaw}
      canManage={ctx.isManagement}
      currentUserId={ctx.userId}
    />
  );
}
