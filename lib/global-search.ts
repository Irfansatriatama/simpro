import type { AppRole } from '@/lib/nav-config';
import { projectListWhere } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

export type SearchProjectHit = { id: string; code: string; name: string };

export type SearchTaskHit = {
  id: string;
  title: string;
  projectId: string;
  projectCode: string;
  projectName: string;
};

const MIN_LENGTH = 2;
const LIMIT = 30;

/**
 * Pencarian proyek + tugas yang dapat diakses pengguna (sesuai peran &
 * keanggotaan). PostgreSQL: filter case-insensitive.
 */
export async function globalSearch(
  userId: string,
  role: AppRole,
  rawQuery: string,
): Promise<{
  projects: SearchProjectHit[];
  tasks: SearchTaskHit[];
  query: string;
  capped: boolean;
}> {
  const query = rawQuery.trim();
  if (query.length < MIN_LENGTH) {
    return { projects: [], tasks: [], query, capped: false };
  }

  const needle = query.slice(0, 120);
  const projectScope = projectListWhere(userId, role);

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: {
        AND: [
          projectScope,
          {
            OR: [
              { name: { contains: needle, mode: 'insensitive' } },
              { code: { contains: needle, mode: 'insensitive' } },
              { description: { contains: needle, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: LIMIT,
      select: { id: true, code: true, name: true },
    }),
    prisma.task.findMany({
      where: {
        AND: [
          { project: projectScope },
          {
            OR: [
              { title: { contains: needle, mode: 'insensitive' } },
              {
                description: { contains: needle, mode: 'insensitive' },
              },
            ],
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: LIMIT,
      select: {
        id: true,
        title: true,
        projectId: true,
        project: { select: { code: true, name: true } },
      },
    }),
  ]);

  return {
    projects,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      projectCode: t.project.code,
      projectName: t.project.name,
    })),
    query,
    capped: projects.length === LIMIT || tasks.length === LIMIT,
  };
}
