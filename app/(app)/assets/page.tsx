import { AssetsClient } from '@/components/assets/assets-client';
import { toAssetRow } from '@/lib/asset-map';
import type { AssetProjectPick, AssetRow, AssetUserPick } from '@/lib/asset-types';
import { requireManagementSession } from '@/lib/management-auth';
import { prisma } from '@/lib/prisma';
import { UserStatus } from '@prisma/client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  if (!(await requireManagementSession())) {
    redirect('/dashboard');
  }

  const [assetsRaw, projectsRaw, usersRaw] = await Promise.all([
    prisma.asset.findMany({ orderBy: { name: 'asc' } }),
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

  const projectIds = Array.from(
    new Set(
      assetsRaw.map((a) => a.projectId).filter((x): x is string => !!x),
    ),
  );
  const userIds = Array.from(
    new Set(
      assetsRaw.map((a) => a.assignedTo).filter((x): x is string => !!x),
    ),
  );

  const [projectsExtra, usersExtra] = await Promise.all([
    projectIds.length
      ? prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, code: true, name: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const projectById = Object.fromEntries(
    projectsExtra.map((p) => [p.id, p]),
  );
  const userById = Object.fromEntries(usersExtra.map((u) => [u.id, u]));

  const rows: AssetRow[] = assetsRaw.map((a) =>
    toAssetRow(
      a,
      a.projectId ? projectById[a.projectId] : null,
      a.assignedTo ? userById[a.assignedTo] : null,
    ),
  );

  const projects: AssetProjectPick[] = projectsRaw;
  const users: AssetUserPick[] = usersRaw;

  return <AssetsClient rows={rows} projects={projects} users={users} />;
}
