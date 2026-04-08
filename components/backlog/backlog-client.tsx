'use client';

import { Priority, TaskStatus, TaskType } from '@prisma/client';
import {
  Layers,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import type {
  BacklogTaskRow,
  EpicPick,
  ProjectMemberPick,
  SprintPick,
} from '@/lib/backlog-types';
import {
  PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_TYPE_LABEL,
} from '@/lib/task-labels';

import { DeleteTaskButton } from './delete-task-button';
import { TaskFormDialog } from './task-form-dialog';

type DepPick = { id: string; title: string };

export function BacklogClient(props: {
  projectId: string;
  tasks: BacklogTaskRow[];
  assigneeMembers: ProjectMemberPick[];
  reporterMembers: ProjectMemberPick[];
  sprints: SprintPick[];
  epics: EpicPick[];
  dependencyOptions: DepPick[];
  canEdit: boolean;
  currentUserId: string;
  canModerateComments: boolean;
}) {
  const {
    projectId,
    tasks,
    assigneeMembers,
    reporterMembers,
    sprints,
    epics,
    dependencyOptions,
    canEdit,
    currentUserId,
    canModerateComments,
  } = props;

  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<'all' | TaskStatus>('all');
  const [typeF, setTypeF] = useState<'all' | TaskType>('all');
  const [priorityF, setPriorityF] = useState<'all' | Priority>('all');
  const [sprintF, setSprintF] = useState<string>('all');
  const [epicF, setEpicF] = useState<string>('all');
  const [groupEpic, setGroupEpic] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<BacklogTaskRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const blob = `${t.title} ${t.description ?? ''} ${t.tags.join(' ')}`.toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchS = statusF === 'all' || t.status === statusF;
      const matchTy = typeF === 'all' || t.type === typeF;
      const matchP = priorityF === 'all' || t.priority === priorityF;
      const matchSp =
        sprintF === 'all' ||
        (sprintF === 'none' ? !t.sprintId : t.sprintId === sprintF);
      const matchE =
        epicF === 'all' ||
        (epicF === 'none' ? !t.epicId : t.epicId === epicF);
      return matchQ && matchS && matchTy && matchP && matchSp && matchE;
    });
  }, [tasks, search, statusF, typeF, priorityF, sprintF, epicF]);

  const backlogFilterActiveCount = useMemo(() => {
    let n = 0;
    if (statusF !== 'all') n++;
    if (typeF !== 'all') n++;
    if (priorityF !== 'all') n++;
    if (sprintF !== 'all') n++;
    if (epicF !== 'all') n++;
    return n;
  }, [statusF, typeF, priorityF, sprintF, epicF]);

  const grouped = useMemo(() => {
    if (!groupEpic) return null;
    const map = new Map<string | null, BacklogTaskRow[]>();
    for (const t of filtered) {
      const key = t.epicId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      const ta = tasks.find((x) => x.epicId === a)?.epicTitle ?? '';
      const tb = tasks.find((x) => x.epicId === b)?.epicTitle ?? '';
      return ta.localeCompare(tb);
    });
    return keys.map((k) => ({
      epicId: k,
      epicTitle:
        k === null
          ? 'Tanpa epic'
          : filtered.find((t) => t.epicId === k)?.epicTitle ?? k,
      items: map.get(k) ?? [],
    }));
  }, [filtered, groupEpic, tasks]);

  function TaskTable({ rows }: { rows: BacklogTaskRow[] }) {
    if (rows.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Tidak ada tugas.
        </p>
      );
    }
    return (
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Judul</th>
              <th className="px-3 py-2 font-medium">Tipe</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Prioritas</th>
              <th className="px-3 py-2 font-medium">SP</th>
              <th className="px-3 py-2 font-medium">Sprint</th>
              <th className="px-3 py-2 font-medium">Epic</th>
              <th className="px-3 py-2 font-medium">Penerima</th>
              <th className="px-3 py-2 font-medium">Jatuh tempo</th>
              {canEdit ? (
                <th className="px-3 py-2 text-right font-medium">Aksi</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-surface/40">
                <td className="max-w-[220px] px-3 py-2">
                  <p className="font-medium text-foreground">{t.title}</p>
                  {t.commentCount + t.checklistCount + t.attachmentCount >
                  0 ? (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {t.commentCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5"
                          title="Komentar"
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                          {t.commentCount}
                        </span>
                      ) : null}
                      {t.checklistCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5"
                          title="Checklist"
                        >
                          <ListChecks className="h-3.5 w-3.5 shrink-0" />
                          {t.checklistCount}
                        </span>
                      ) : null}
                      {t.attachmentCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5"
                          title="Lampiran"
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          {t.attachmentCount}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {t.dependsOn.length > 0 ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tergantung:{' '}
                      {t.dependsOn.map((d) => d.title).join(', ')}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {TASK_TYPE_LABEL[t.type]}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {TASK_STATUS_LABEL[t.status]}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {PRIORITY_LABEL[t.priority]}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {t.storyPoints ?? '—'}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-muted-foreground">
                  {t.sprintName ?? '—'}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-muted-foreground">
                  {t.epicTitle ?? '—'}
                </td>
                <td className="max-w-[140px] px-3 py-2 text-xs text-muted-foreground">
                  {t.assignees.length === 0
                    ? '—'
                    : t.assignees.map((a) => a.name).join(', ')}
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                  {t.dueDate
                    ? new Date(t.dueDate).toLocaleDateString('id-ID')
                    : '—'}
                </td>
                {canEdit ? (
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDialogMode('edit');
                          setEditing(t);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <DeleteTaskButton
                        projectId={projectId}
                        taskId={t.id}
                      />
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Backlog</h2>
          <p className="text-sm text-muted-foreground">
            Kelola tugas, epic, sprint assignment, dan dependensi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={groupEpic ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupEpic((g) => !g)}
          >
            <Layers className="mr-1.5 h-4 w-4" />
            Grup epic
          </Button>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setDialogMode('create');
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Tugas baru
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, deskripsi, tag…"
            className="pl-9"
          />
        </div>
        <FilterPanelSheet
          title="Filter backlog"
          activeCount={backlogFilterActiveCount}
        >
          <FilterField label="Status">
            <SelectNative
              value={statusF}
              onChange={(e) =>
                setStatusF(e.target.value as 'all' | TaskStatus)
              }
              className="w-full"
            >
              <option value="all">Semua status</option>
              {Object.values(TaskStatus).map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABEL[s]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Tipe">
            <SelectNative
              value={typeF}
              onChange={(e) => setTypeF(e.target.value as 'all' | TaskType)}
              className="w-full"
            >
              <option value="all">Semua tipe</option>
              {Object.values(TaskType).map((ty) => (
                <option key={ty} value={ty}>
                  {TASK_TYPE_LABEL[ty]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Prioritas">
            <SelectNative
              value={priorityF}
              onChange={(e) =>
                setPriorityF(e.target.value as 'all' | Priority)
              }
              className="w-full"
            >
              <option value="all">Semua prioritas</option>
              {Object.values(Priority).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Sprint">
            <SelectNative
              value={sprintF}
              onChange={(e) => setSprintF(e.target.value)}
              className="w-full"
            >
              <option value="all">Semua sprint</option>
              <option value="none">Tanpa sprint</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Epic">
            <SelectNative
              value={epicF}
              onChange={(e) => setEpicF(e.target.value)}
              className="w-full"
            >
              <option value="all">Semua epic</option>
              <option value="none">Tanpa epic</option>
              {epics.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title.length > 40 ? `${e.title.slice(0, 40)}…` : e.title}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        </FilterPanelSheet>
      </div>

      {groupEpic && grouped ? (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.epicId ?? 'none'}>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {g.epicTitle}
              </h3>
              <TaskTable rows={g.items} />
            </div>
          ))}
        </div>
      ) : (
        <TaskTable rows={filtered} />
      )}

      {canEdit ? (
        <TaskFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          projectId={projectId}
          task={dialogMode === 'edit' ? editing : null}
          assigneeMembers={assigneeMembers}
          reporterMembers={reporterMembers}
          sprints={sprints}
          epics={epics}
          dependencyOptions={dependencyOptions}
          canEdit={canEdit}
          defaultReporterId={currentUserId}
          currentUserId={currentUserId}
          canModerateComments={canModerateComments}
        />
      ) : null}
    </div>
  );
}
