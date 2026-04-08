'use client';

import type { TaskExtrasPayload } from '@/app/actions/task-extras';
import {
  addTaskAttachmentAction,
  addTaskChecklistItemAction,
  addTaskCommentAction,
  deleteTaskAttachmentAction,
  deleteTaskChecklistItemAction,
  deleteTaskCommentAction,
  fetchTaskExtrasAction,
  moveTaskChecklistItemAction,
  toggleTaskChecklistItemAction,
  updateTaskChecklistItemTextAction,
} from '@/app/actions/task-extras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState, useTransition } from 'react';

type Props = {
  open: boolean;
  projectId: string;
  taskId: string;
  currentUserId: string;
  canModerateComments: boolean;
};

export function TaskEditExtras(props: Props) {
  const {
    open,
    projectId,
    taskId,
    currentUserId,
    canModerateComments,
  } = props;

  const [data, setData] = useState<TaskExtrasPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    const r = await fetchTaskExtrasAction(taskId, projectId);
    if (r.ok) {
      setData(r.data);
      setLoadError(null);
    } else {
      setLoadError(r.error);
    }
  }, [taskId, projectId]);

  useEffect(() => {
    if (!open || !taskId) return;
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    (async () => {
      const r = await fetchTaskExtrasAction(taskId, projectId);
      setLoading(false);
      if (r.ok) {
        setData(r.data);
      } else {
        setData(null);
        setLoadError(r.error);
      }
    })();
  }, [open, taskId, projectId]);

  function runMutation(
    action: (fd: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    patch: (fd: FormData) => void,
  ) {
    startTransition(async () => {
      setActionError(null);
      const fd = new FormData();
      fd.set('projectId', projectId);
      fd.set('taskId', taskId);
      patch(fd);
      const r = await action(fd);
      if (!r.ok) {
        setActionError(r.error);
        return;
      }
      await reload();
    });
  }

  return (
    <div className="mt-4 space-y-6 border-t border-border pt-4">
      <h3 className="text-sm font-semibold text-foreground">
        Komentar, checklist & lampiran
      </h3>
      <p className="text-xs text-muted-foreground">
        Lampiran berupa tautan (URL), bukan unggah file.
      </p>

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat…
        </p>
      ) : null}
      {loadError ? (
        <p className="text-sm text-danger" role="alert">
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      {data ? (
        <>
          <section className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Komentar
            </h4>
            <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border bg-surface/30 p-2 text-sm">
              {data.comments.length === 0 ? (
                <li className="text-muted-foreground">Belum ada komentar.</li>
              ) : (
                data.comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded border border-border/60 bg-card/80 p-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {c.authorName} ·{' '}
                          {new Date(c.createdAt).toLocaleString('id-ID')}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-foreground">
                          {c.content}
                        </p>
                      </div>
                      {c.authorId === currentUserId || canModerateComments ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-danger"
                          disabled={pending}
                          aria-label="Hapus komentar"
                          onClick={() =>
                            runMutation(deleteTaskCommentAction, (fd) =>
                              fd.set('commentId', c.id),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>
            <form
              className="grid gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                startTransition(async () => {
                  setActionError(null);
                  const fd = new FormData(form);
                  fd.set('projectId', projectId);
                  fd.set('taskId', taskId);
                  const r = await addTaskCommentAction(fd);
                  if (!r.ok) {
                    setActionError(r.error);
                    return;
                  }
                  form.reset();
                  await reload();
                });
              }}
            >
              <Label htmlFor="te-comment">Komentar baru</Label>
              <Textarea
                id="te-comment"
                name="content"
                rows={2}
                required
                maxLength={5000}
                placeholder="Tulis komentar…"
                disabled={pending}
              />
              <div>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? 'Mengirim…' : 'Kirim komentar'}
                </Button>
              </div>
            </form>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Checklist
            </h4>
            <ul className="space-y-2">
              {data.checklist.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Belum ada item.
                </li>
              ) : (
                data.checklist.map((item, index) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    index={index}
                    total={data.checklist.length}
                    pending={pending}
                    onToggle={() =>
                      runMutation(toggleTaskChecklistItemAction, (fd) => {
                        fd.set('itemId', item.id);
                        fd.set('done', item.done ? 'false' : 'true');
                      })
                    }
                    onDelete={() =>
                      runMutation(deleteTaskChecklistItemAction, (fd) =>
                        fd.set('itemId', item.id),
                      )
                    }
                    onMove={(dir) =>
                      runMutation(moveTaskChecklistItemAction, (fd) => {
                        fd.set('itemId', item.id);
                        fd.set('direction', dir);
                      })
                    }
                    onSaveText={(text) =>
                      runMutation(updateTaskChecklistItemTextAction, (fd) => {
                        fd.set('itemId', item.id);
                        fd.set('text', text);
                      })
                    }
                  />
                ))
              )}
            </ul>
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                startTransition(async () => {
                  setActionError(null);
                  const fd = new FormData(form);
                  fd.set('projectId', projectId);
                  fd.set('taskId', taskId);
                  const r = await addTaskChecklistItemAction(fd);
                  if (!r.ok) {
                    setActionError(r.error);
                    return;
                  }
                  form.reset();
                  await reload();
                });
              }}
            >
              <div className="grid flex-1 gap-1">
                <Label htmlFor="te-check-new">Item baru</Label>
                <Input
                  id="te-check-new"
                  name="text"
                  maxLength={500}
                  required
                  placeholder="Contoh: Review desain"
                  disabled={pending}
                />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                Tambah
              </Button>
            </form>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Lampiran (URL)
            </h4>
            <ul className="space-y-2 text-sm">
              {data.attachments.length === 0 ? (
                <li className="text-muted-foreground">Belum ada lampiran.</li>
              ) : (
                data.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/80 px-2 py-1.5"
                  >
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-1 font-medium text-primary hover:underline"
                    >
                      <span className="truncate">{a.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-danger"
                      disabled={pending}
                      aria-label="Hapus lampiran"
                      onClick={() =>
                        runMutation(deleteTaskAttachmentAction, (fd) =>
                          fd.set('attachmentId', a.id),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))
              )}
            </ul>
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                startTransition(async () => {
                  setActionError(null);
                  const fd = new FormData(form);
                  fd.set('projectId', projectId);
                  fd.set('taskId', taskId);
                  const r = await addTaskAttachmentAction(fd);
                  if (!r.ok) {
                    setActionError(r.error);
                    return;
                  }
                  form.reset();
                  await reload();
                });
              }}
            >
              <div className="grid gap-1">
                <Label htmlFor="te-att-name">Nama</Label>
                <Input
                  id="te-att-name"
                  name="name"
                  maxLength={200}
                  required
                  placeholder="Dokumen / mockup"
                  disabled={pending}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="te-att-url">URL (https://…)</Label>
                <Input
                  id="te-att-url"
                  name="url"
                  type="url"
                  required
                  placeholder="https://…"
                  disabled={pending}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" size="sm" disabled={pending}>
                  Tambah lampiran
                </Button>
              </div>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ChecklistRow(props: {
  item: TaskExtrasPayload['checklist'][number];
  index: number;
  total: number;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onSaveText: (text: string) => void;
}) {
  const {
    item,
    index,
    total,
    pending,
    onToggle,
    onDelete,
    onMove,
    onSaveText,
  } = props;
  const [text, setText] = useState(item.text);

  useEffect(() => {
    setText(item.text);
  }, [item.id, item.text]);

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-card/80 p-2 sm:flex-row sm:items-center">
      <div className="flex items-start gap-2 sm:flex-1">
        <input
          type="checkbox"
          checked={item.done}
          disabled={pending}
          onChange={onToggle}
          className="mt-1 rounded border-border"
          aria-label={`Selesai: ${item.text}`}
        />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const next = text.trim();
            if (next === item.text || next.length === 0) {
              setText(item.text);
              return;
            }
            onSaveText(next);
          }}
          disabled={pending}
          className="text-sm"
        />
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={pending || index === 0}
          aria-label="Naikkan"
          onClick={() => onMove('up')}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={pending || index >= total - 1}
          aria-label="Turunkan"
          onClick={() => onMove('down')}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-danger"
          disabled={pending}
          aria-label="Hapus item"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
