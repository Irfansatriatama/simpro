import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';

import { ProjectSubnav } from '@/components/projects/project-subnav';
import { auth } from '@/lib/auth';
import { canManageProjects, projectViewWhere } from '@/lib/project-access';
import {
  PRIORITY_LABEL,
  PROJECT_PHASE_LABEL,
  PROJECT_STATUS_LABEL,
} from '@/lib/project-labels';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function ProjectIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const role = getUserRole(session);
  const project = await prisma.project.findFirst({
    where: projectViewWhere(session.user.id, role, params.id),
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      coverColor: true,
      progress: true,
      status: true,
      phase: true,
      priority: true,
    },
  });

  if (!project) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/projects"
        className="inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Semua proyek
      </Link>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div
          className="h-3 sm:h-4"
          style={{ backgroundColor: project.coverColor }}
        />
        <div className="p-4 sm:p-5">
          <p className="font-mono text-xs text-muted-foreground sm:text-sm">
            {project.code}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
            {project.name}
          </h1>
          {project.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-md border border-border bg-surface/80 px-2.5 py-1 text-xs font-medium text-foreground">
              {PROJECT_STATUS_LABEL[project.status]}
            </span>
            <span className="rounded-md border border-border bg-surface/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {project.phase
                ? PROJECT_PHASE_LABEL[project.phase]
                : 'Tanpa fase'}
            </span>
            <span className="rounded-md border border-border bg-surface/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {PRIORITY_LABEL[project.priority]}
            </span>
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              Progres {project.progress}%
            </span>
          </div>
        </div>
      </div>

      <ProjectSubnav
        projectId={project.id}
        showReportsLink={canManageProjects(role)}
      />
      <div className="pb-8">{children}</div>
    </div>
  );
}
