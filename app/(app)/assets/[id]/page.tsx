import { AssetDetailClient } from '@/components/assets/asset-detail-client';
import { toAssetRow } from '@/lib/asset-map';
import type { AssetProjectPick, AssetUserPick } from '@/lib/asset-types';
import { requireManagementSession } from '@/lib/management-auth';
import { prisma } from '@/lib/prisma';
import { UserStatus } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!(await requireManagementSession())) {
    redirect('/dashboard');
  }

  const { id } = params;

  const assetDb = await prisma.asset.findUnique({ where: { id } });
  if (!assetDb) notFound();

  const [projectRef, assigneeRef, projectsRaw, usersRaw] = await Promise.all([
    assetDb.projectId
      ? prisma.project.findUnique({
          where: { id: assetDb.projectId },
          select: { code: true, name: true },
        })
      : Promise.resolve(null),
    assetDb.assignedTo
      ? prisma.user.findUnique({
          where: { id: assetDb.assignedTo },
          select: { name: true },
        })
      : Promise.resolve(null),
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

  const asset = toAssetRow(assetDb, projectRef, assigneeRef);
  const projects: AssetProjectPick[] = projectsRaw;
  const users: AssetUserPick[] = usersRaw;

  return (
    <AssetDetailClient asset={asset} projects={projects} users={users} />
  );
}
