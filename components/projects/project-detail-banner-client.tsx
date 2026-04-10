'use client';

import { ChevronRight, Folder, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  PRIORITY_LABEL,
  PROJECT_PHASE_LABEL,
  PROJECT_STATUS_LABEL,
} from '@/lib/project-labels';
import type { ProjectDetailPayload } from '@/lib/project-types';
import type { ProjectPhase, ProjectStatus } from '@prisma/client';

import { ProjectFormDialog } from './project-form-dialog';

type ClientOpt = { id: string; companyName: string };
type ParentOpt = { id: string; code: string; name: string };

function isOverdue(
  endDate: Date | string | null,
  status: ProjectStatus,
): boolean {
  if (!endDate) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end < today;
}

export function ProjectDetailBannerClient(props: {
  project: ProjectDetailPayload['project'];
  parentName: string | null;
  parentId: string | null;
  canManage: boolean;
  clients: ClientOpt[];
  parents: ParentOpt[];
}) {
  const { project, parentName, parentId, canManage, clients, parents } =
    props;
  const [formOpen, setFormOpen] = useState(false);
  const overdue = isOverdue(project.endDate, project.status);
  const titleDisplay =
    parentName && parentId
      ? `${parentName} / ${project.name}`
      : project.name;

  return (
    <>
      <div
        className="overflow-hidden rounded-xl text-white shadow-lg"
        style={{ backgroundColor: project.coverColor }}
      >
        <div className="bg-gradient-to-b from-black/25 to-black/10 px-4 py-5 sm:px-6 sm:py-6">
          <nav
            className="flex flex-wrap items-center gap-1 text-sm text-white/85"
            aria-label="Breadcrumb"
          >
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 hover:text-white"
            >
              <Folder className="h-4 w-4" />
              Proyek
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
            <span className="max-w-[min(100%,28rem)] truncate font-medium text-white">
              {titleDisplay}
            </span>
          </nav>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                  {PROJECT_STATUS_LABEL[project.status]}
                </span>
                {project.phase ? (
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                    {PROJECT_PHASE_LABEL[project.phase as ProjectPhase]}
                  </span>
                ) : null}
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                  {PRIORITY_LABEL[project.priority]}
                </span>
                {overdue ? (
                  <span className="rounded-md bg-red-600/90 px-2 py-0.5 text-xs font-semibold">
                    Lewat jadwal
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {titleDisplay}
              </h1>
              <p className="mt-1 font-mono text-sm text-white/80">
                {project.code}
              </p>
              {project.description ? (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/90">
                  {project.description}
                </p>
              ) : null}
            </div>
            {canManage ? (
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 border-white/40 bg-white/15 text-white hover:bg-white/25"
                onClick={() => setFormOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit proyek
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {canManage ? (
        <ProjectFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          mode="edit"
          project={project}
          clients={clients}
          parents={parents.filter((x) => x.id !== project.id)}
        />
      ) : null}
    </>
  );
}
