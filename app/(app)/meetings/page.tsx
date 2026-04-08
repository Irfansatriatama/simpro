import { MeetingsClient } from '@/components/meetings/meetings-client';
import { requireManagementSession } from '@/lib/management-auth';
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
  if (!(await requireManagementSession())) {
    redirect('/dashboard');
  }

  const [meetingsRaw, projectsRaw, usersRaw] = await Promise.all([
    prisma.meeting.findMany({
      orderBy: { date: 'desc' },
      take: 300,
      include: {
        creator: { select: { name: true } },
        projects: {
          include: { project: { select: { code: true } } },
        },
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

  const rows: MeetingListRow[] = meetingsRaw.map((m) => ({
    id: m.id,
    title: m.title,
    type: m.type,
    status: m.status,
    date: m.date.toISOString(),
    location: m.location,
    creatorName: m.creator.name,
    projectCodes: m.projects.map((mp) => mp.project.code).join(', '),
  }));

  const projects: MeetingProjectPick[] = projectsRaw;
  const users: MeetingUserPick[] = usersRaw;

  return (
    <MeetingsClient rows={rows} projects={projects} users={users} />
  );
}
