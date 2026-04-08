import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';

import { ProjectSubnav } from '@/components/projects/project-subnav';
import { auth } from '@/lib/auth';
import { canManageProjects, projectViewWhere } from '@/lib/project-access';
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
    select: { id: true, code: true, name: true },
  });

  if (!project) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/projects"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Semua proyek
        </Link>
        <div className="mt-2">
          <p className="font-mono text-sm text-muted-foreground">
            {project.code}
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            {project.name}
          </h1>
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
