import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import type { AppRole } from '@/lib/nav-config';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import type { Prisma } from '@prisma/client';

export type MeetingsSessionContext = {
  userId: string;
  role: AppRole;
  isManagement: boolean;
};

export async function requireMeetingsSession(): Promise<MeetingsSessionContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  const role = getUserRole(session);
  const isManagement = role === 'admin' || role === 'pm';
  return { userId: session.user.id, role, isManagement };
}

export function meetingListWhere(
  userId: string,
  isManagement: boolean,
): Prisma.MeetingWhereInput {
  if (isManagement) return {};
  return {
    OR: [
      { createdBy: userId },
      { attendees: { some: { userId } } },
    ],
  };
}

export async function canViewMeeting(
  meetingId: string,
  userId: string,
  role: AppRole,
): Promise<boolean> {
  if (role === 'admin' || role === 'pm') {
    const exists = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true },
    });
    return !!exists;
  }
  const row = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      OR: [{ createdBy: userId }, { attendees: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!row;
}
