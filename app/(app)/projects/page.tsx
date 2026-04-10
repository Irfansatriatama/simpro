import { ProjectsClient } from '@/components/projects/projects-client';
import { auth } from '@/lib/auth';
import {
  canManageProjects,
  projectListWhere,
} from '@/lib/project-access';
import type { ProjectListRow } from '@/lib/project-types';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const canManage = canManageProjects(role);

  const rows = await prisma.project.findMany({
    where: projectListWhere(userId, role),
    orderBy: { updatedAt: 'desc' },
    include: {
      client: { select: { id: true, companyName: true, logo: true } },
      parent: { select: { code: true } },
      _count: { select: { members: true } },
      members: {
        take: 4,
        orderBy: { user: { name: 'asc' } },
        select: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  const projects: ProjectListRow[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    status: r.status,
    phase: r.phase,
    priority: r.priority,
    progress: r.progress,
    coverColor: r.coverColor,
    clientId: r.clientId,
    clientName: r.client?.companyName ?? null,
    clientLogo: r.client?.logo ?? null,
    parentId: r.parentId,
    parentCode: r.parent?.code ?? null,
    startDate: r.startDate ? r.startDate.toISOString() : null,
    endDate: r.endDate ? r.endDate.toISOString() : null,
    actualEndDate: r.actualEndDate ? r.actualEndDate.toISOString() : null,
    budget: r.budget,
    actualCost: r.actualCost,
    tags: r.tags,
    memberCount: r._count.members,
    memberPreview: r.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      image: m.user.image,
    })),
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  const clients = canManage
    ? await prisma.client.findMany({
        where: { status: 'active' },
        select: { id: true, companyName: true },
        orderBy: { companyName: 'asc' },
      })
    : [];

  const parents = canManage
    ? await prisma.project.findMany({
        where: projectListWhere(userId, role),
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      })
    : [];

  return (
    <ProjectsClient
      projects={projects}
      canManage={canManage}
      clients={clients}
      parents={parents}
    />
  );
}
