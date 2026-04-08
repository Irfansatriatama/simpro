import { ActivityLogClient } from '@/components/activity-log/activity-log-client';
import { auth } from '@/lib/auth';
import type { ActivityLogRow } from '@/lib/activity-log-types';
import { projectViewWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 400;

export default async function ActivityLogPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const projectId = params.id;

  const project = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, projectId),
    select: { id: true },
  });
  if (!project) notFound();

  const raw = await prisma.activityLog.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: PAGE_LIMIT,
  });

  const rows: ActivityLogRow[] = raw.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    entityName: r.entityName,
    action: r.action,
    actorId: r.actorId,
    actorName: r.actorName,
    changes: r.changes,
    metadata: r.metadata,
    createdAt: r.createdAt.toISOString(),
  }));

  return <ActivityLogClient rows={rows} />;
}
