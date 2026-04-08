import { MembersClient } from '@/components/members/members-client';
import { auth } from '@/lib/auth';
import type { MemberRow } from '@/lib/members-types';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const role = (session.user as { role?: string }).role;
  if (role !== 'admin') redirect('/dashboard');

  const rows = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      displayUsername: true,
      role: true,
      status: true,
      image: true,
      phoneNumber: true,
      company: true,
      department: true,
      position: true,
      bio: true,
      linkedin: true,
      github: true,
      timezone: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  const members: MemberRow[] = rows.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
  }));

  return (
    <MembersClient members={members} currentUserId={session.user.id} />
  );
}
