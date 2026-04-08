'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { ProjectDetailPayload } from '@/lib/project-types';

import { ProjectFormDialog } from './project-form-dialog';

type ClientOpt = { id: string; companyName: string };
type ParentOpt = { id: string; code: string; name: string };

export function ProjectDetailToolbar(props: {
  project: ProjectDetailPayload['project'];
  clients: ClientOpt[];
  parents: ParentOpt[];
}) {
  const [open, setOpen] = useState(false);
  const { project, clients, parents } = props;

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Edit proyek
      </Button>
      <ProjectFormDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        project={project}
        clients={clients}
        parents={parents}
      />
    </>
  );
}
