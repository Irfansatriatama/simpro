import { MeetingDetailClient } from '@/components/meetings/meeting-detail-client';
import { requireManagementSession } from '@/lib/management-auth';
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
  if (!(await requireManagementSession())) {
    redirect('/dashboard');
  }

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
              select: { id: true, name: true, username: true, email: true },
            },
          },
        },
        agendaItems: { orderBy: { order: 'asc' } },
      },
    }),
    prisma.project.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    }),
    prisma.user.findMany({
      where: { status: UserStatus.active },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true, email: true },
    }),
  ]);

  if (!meetingRaw) notFound();

  const meeting: MeetingDetail = {
    id: meetingRaw.id,
    title: meetingRaw.title,
    description: meetingRaw.description,
    type: meetingRaw.type,
    date: meetingRaw.date.toISOString(),
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
  };

  const projectLinks: MeetingProjectPick[] = meetingRaw.projects.map(
    (mp) => mp.project,
  );
  const attendeeUsers: MeetingUserPick[] = meetingRaw.attendees.map(
    (a) => a.user,
  );

  return (
    <MeetingDetailClient
      meeting={meeting}
      projectLinks={projectLinks}
      attendeeUsers={attendeeUsers}
      projects={projectsRaw}
      users={usersRaw}
    />
  );
}
