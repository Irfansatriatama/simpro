'use client';

import { ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useTransition } from 'react';

import { assignTaskToSprintAction } from '@/app/actions/tasks';
import type { SprintRow } from '@/lib/sprint-types';
import type { SprintTaskRef } from '@/lib/sprint-planning-types';
import { PRIORITY_LABEL } from '@/lib/task-labels';
import { Button } from '@/components/ui/button';
import { SelectNative } from '@/components/ui/select-native';

function TaskLine({
  task,
  otherSprintName,
}: {
  task: SprintTaskRef;
  otherSprintName?: string | null;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground line-clamp-2">{task.title}</p>
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{PRIORITY_LABEL[task.priority]}</span>
        {task.storyPoints != null ? (
          <span className="tabular-nums">{task.storyPoints} SP</span>
        ) : null}
        {task.assigneeNames.length > 0 ? (
          <span className="truncate">{task.assigneeNames.join(', ')}</span>
        ) : null}
        {otherSprintName ? (
          <span className="text-amber-700 dark:text-amber-400">
            Sprint: {otherSprintName}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SprintPlanningView(props: {
  projectId: string;
  sprints: SprintRow[];
  tasks: SprintTaskRef[];
  planningSprintId: string;
  onPlanningSprintId: (id: string) => void;
  canEdit: boolean;
}) {
  const {
    projectId,
    sprints,
    tasks,
    planningSprintId,
    onPlanningSprintId,
    canEdit,
  } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const sprintNameById = useMemo(
    () => new Map(sprints.map((s) => [s.id, s.name] as const)),
    [sprints],
  );

  const selectedSprint = sprints.find((s) => s.id === planningSprintId);

  const { outside, inside } = useMemo(() => {
    const out: SprintTaskRef[] = [];
    const ins: SprintTaskRef[] = [];
    for (const t of tasks) {
      if (t.sprintId === planningSprintId) ins.push(t);
      else out.push(t);
    }
    return { outside: out, inside: ins };
  }, [tasks, planningSprintId]);

  function moveToSprint(taskId: string) {
    if (!planningSprintId || !canEdit) return;
    startTransition(async () => {
      const r = await assignTaskToSprintAction({
        projectId,
        taskId,
        sprintId: planningSprintId,
      });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  function removeFromSprint(taskId: string) {
    if (!canEdit) return;
    startTransition(async () => {
      const r = await assignTaskToSprintAction({
        projectId,
        taskId,
        sprintId: null,
      });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  if (sprints.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        Buat sprint terlebih dahulu di tab{' '}
        <strong className="text-foreground">Daftar sprint</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Sprint:</span>
          <SelectNative
            value={planningSprintId}
            onChange={(e) => onPlanningSprintId(e.target.value)}
            className="min-w-[200px] max-w-full"
            aria-label="Pilih sprint untuk perencanaan"
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </SelectNative>
        </div>
        <Link
          href={`/projects/${projectId}/board?sprint=${encodeURIComponent(planningSprintId)}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Buka board proyek terfilter sprint →
        </Link>
      </div>

      {!selectedSprint ? (
        <p className="text-sm text-muted-foreground">Pilih sprint.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Di luar sprint ini
              <span className="ml-2 font-normal text-muted-foreground">
                ({outside.length})
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Tugas belum masuk sprint ini (termasuk dari sprint lain atau tanpa
              sprint).
            </p>
            <div className="max-h-[min(60vh,520px)] space-y-2 overflow-y-auto rounded-lg border border-border bg-surface/40 p-2">
              {outside.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Semua tugas proyek sudah di sprint ini, atau tidak ada tugas.
                </p>
              ) : (
                outside.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
                  >
                    <div className="min-w-0 flex-1">
                      <TaskLine
                        task={t}
                        otherSprintName={
                          t.sprintId
                            ? sprintNameById.get(t.sprintId) ?? null
                            : null
                        }
                      />
                    </div>
                    {canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="shrink-0 gap-1"
                        disabled={pending}
                        onClick={() => moveToSprint(t.id)}
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden />
                        Masukkan
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Dalam sprint ini
              <span className="ml-2 font-normal text-muted-foreground">
                ({inside.length})
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Backlog sprint — keluarkan jika tidak ikut iterasi ini.
            </p>
            <div className="max-h-[min(60vh,520px)] space-y-2 overflow-y-auto rounded-lg border border-border bg-surface/40 p-2">
              {inside.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Belum ada tugas. Tambahkan dari kolom kiri.
                </p>
              ) : (
                inside.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
                  >
                    {canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1 sm:order-2"
                        disabled={pending}
                        onClick={() => removeFromSprint(t.id)}
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Keluarkan
                      </Button>
                    ) : null}
                    <div className="min-w-0 flex-1 sm:order-1">
                      <TaskLine task={t} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
