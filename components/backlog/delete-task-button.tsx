'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { deleteTaskAction } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';

export function DeleteTaskButton({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-danger hover:text-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm('Hapus tugas ini? Tindakan tidak dapat dibatalkan.')) {
          return;
        }
        const fd = new FormData();
        fd.set('projectId', projectId);
        fd.set('taskId', taskId);
        startTransition(async () => {
          const r = await deleteTaskAction(fd);
          if (!r.ok) alert(r.error);
          else router.refresh();
        });
      }}
    >
      Hapus
    </Button>
  );
}
