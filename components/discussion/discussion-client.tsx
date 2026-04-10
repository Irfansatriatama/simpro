'use client';

import {
  MessageSquarePlus,
  Paperclip,
  Pin,
  PinOff,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  addDiscussionAttachmentAction,
  createDiscussionReplyAction,
  deleteDiscussionAction,
  deleteDiscussionAttachmentAction,
  deleteDiscussionReplyAction,
  toggleDiscussionPinAction,
  updateDiscussionReplyAction,
} from '@/app/actions/discussions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import {
  DISCUSSION_TYPES,
  DISCUSSION_TYPE_LABEL,
  discussionTypeLabel,
} from '@/lib/discussion-constants';
import { discussionListPath } from '@/lib/discussion-list-url';
import type {
  DiscussionAttachmentRow,
  DiscussionReplyRow,
  DiscussionThreadRow,
} from '@/lib/discussion-types';
import { cn } from '@/lib/utils';

import { DiscussionFormDialog } from './discussion-form-dialog';
import { DiscussionMarkdownBody } from './discussion-markdown-body';

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ThreadAttachmentsBlock(props: {
  projectId: string;
  thread: DiscussionThreadRow;
  canPost: boolean;
  canDelete: boolean;
}) {
  const { projectId, thread, canPost, canDelete } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function addAttachment() {
    setError(null);
    const fd = new FormData();
    fd.set('projectId', projectId);
    fd.set('discussionId', thread.id);
    fd.set('name', name);
    fd.set('url', url);
    startTransition(async () => {
      const r = await addDiscussionAttachmentAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setName('');
      setUrl('');
      router.refresh();
    });
  }

  return (
    <div className="border-t border-border pt-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" aria-hidden />
        Lampiran ({thread.attachments.length})
      </h3>
      {thread.attachments.length > 0 ? (
        <ul className="mb-3 space-y-1.5 text-sm">
          {thread.attachments.map((a: DiscussionAttachmentRow) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 bg-surface/30 px-2 py-1.5"
            >
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 break-all text-primary underline-offset-4 hover:underline"
              >
                {a.name}
              </a>
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 text-xs text-destructive"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(`Hapus lampiran "${a.name}"?`)) return;
                    const fd = new FormData();
                    fd.set('projectId', projectId);
                    fd.set('discussionId', thread.id);
                    fd.set('attachmentId', a.id);
                    startTransition(async () => {
                      const r = await deleteDiscussionAttachmentAction(fd);
                      if (!r.ok) window.alert(r.error);
                      else router.refresh();
                    });
                  }}
                >
                  Hapus
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canPost ? (
        <div className="space-y-2 rounded-md border border-dashed border-border/80 p-2">
          <p className="text-xs text-muted-foreground">
            Tambah tautan (URL https) — sama seperti lampiran tugas.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama berkas / label"
              className="text-sm"
              aria-label="Nama lampiran"
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="text-sm"
              aria-label="URL lampiran"
            />
          </div>
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending || !name.trim() || !url.trim()}
            onClick={addAttachment}
          >
            {pending ? 'Menyimpan…' : 'Tambah lampiran'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function DiscussionClient(props: {
  projectId: string;
  threads: DiscussionThreadRow[];
  totalThreads: number;
  page: number;
  pageSize: number;
  query: string;
  typeFilter: string;
  currentUserId: string;
  canPost: boolean;
  canModerate: boolean;
}) {
  const {
    projectId,
    threads,
    totalThreads,
    page,
    pageSize,
    query,
    typeFilter,
    currentUserId,
    canPost,
    canModerate,
  } = props;
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingThread, setEditingThread] = useState<DiscussionThreadRow | null>(
    null,
  );
  const [editingReply, setEditingReply] = useState<DiscussionReplyRow | null>(
    null,
  );
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  const totalPages = Math.max(1, Math.ceil(totalThreads / pageSize));
  const listBase = { q: query, type: typeFilter };

  function canEditEntity(authorId: string): boolean {
    return authorId === currentUserId || canModerate;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Diskusi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Topik dan balasan untuk tim proyek. Isi mendukung markdown ringan;
            lampiran berupa tautan. Paginasi dan filter memakai pencarian di
            server.
          </p>
        </div>
        {canPost ? (
          <Button
            type="button"
            onClick={() => {
              setFormMode('create');
              setEditingThread(null);
              setFormOpen(true);
            }}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Topik baru
          </Button>
        ) : null}
      </div>

      <form
        method="get"
        action={`/projects/${projectId}/discussion`}
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-card sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Cari judul atau isi…"
            className="pl-9"
            aria-label="Cari diskusi"
          />
        </div>
        <div className="w-full sm:w-48">
          <Label htmlFor="disc-filter-type" className="sr-only">
            Tipe topik
          </Label>
          <SelectNative
            id="disc-filter-type"
            name="type"
            defaultValue={typeFilter}
            className="w-full"
            aria-label="Filter tipe diskusi"
          >
            <option value="all">Semua tipe</option>
            {DISCUSSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {DISCUSSION_TYPE_LABEL[t]}
              </option>
            ))}
          </SelectNative>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" size="sm">
            Terapkan
          </Button>
          {(query || typeFilter !== 'all') && (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={discussionListPath(projectId, {})}>Reset</Link>
            </Button>
          )}
        </div>
      </form>

      <p className="text-xs text-muted-foreground">
        Menampilkan {threads.length} dari {totalThreads} topik
        {totalPages > 1 ? ` · Halaman ${page} / ${totalPages}` : ''}.
      </p>

      <div className="space-y-4">
        {threads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Belum ada diskusi yang cocok.
          </p>
        ) : (
          threads.map((t) => (
            <article
              key={t.id}
              className={cn(
                'rounded-lg border border-border bg-card p-4 shadow-card',
                t.pinned && 'ring-1 ring-primary/25',
              )}
            >
              <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.pinned ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                        <Pin className="h-3 w-3" />
                        Disematkan
                      </span>
                    ) : null}
                    <span className="rounded bg-border/80 px-2 py-0.5 text-xs text-muted-foreground">
                      {discussionTypeLabel(t.type)}
                    </span>
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    {t.title?.trim() ? t.title : 'Tanpa judul'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t.authorName} (@{t.authorUsername}) · {fmtWhen(t.createdAt)}
                    {t.updatedAt !== t.createdAt ? ' · diedit' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {canModerate ? (
                    <PinToggleButton projectId={projectId} thread={t} />
                  ) : null}
                  {canEditEntity(t.authorId) ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => {
                          setFormMode('edit');
                          setEditingThread(t);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <DeleteThreadButton projectId={projectId} thread={t} />
                    </>
                  ) : null}
                </div>
              </header>
              <div className="py-3">
                <DiscussionMarkdownBody content={t.content} />
              </div>

              <ThreadAttachmentsBlock
                projectId={projectId}
                thread={t}
                canPost={canPost}
                canDelete={canEditEntity(t.authorId)}
              />

              <section className="border-t border-border pt-3">
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Balasan ({t.replies.length})
                </h3>
                <ul className="space-y-3">
                  {t.replies.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-md border border-border/80 bg-surface/40 px-3 py-2"
                    >
                      {editingReply?.id === r.id ? (
                        <ReplyEditForm
                          projectId={projectId}
                          reply={r}
                          onCancel={() => setEditingReply(null)}
                          onSaved={() => {
                            setEditingReply(null);
                            router.refresh();
                          }}
                        />
                      ) : (
                        <>
                          <DiscussionMarkdownBody content={r.content} />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {r.authorName} (@{r.authorUsername}) ·{' '}
                            {fmtWhen(r.createdAt)}
                          </p>
                          {canEditEntity(r.authorId) ? (
                            <div className="mt-2 flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditingReply(r)}
                              >
                                Edit
                              </Button>
                              <DeleteReplyButton
                                projectId={projectId}
                                replyId={r.id}
                              />
                            </div>
                          ) : null}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {canPost ? (
                  <ReplyComposer
                    projectId={projectId}
                    discussionId={t.id}
                    draft={replyDraft[t.id] ?? ''}
                    onDraftChange={(v) =>
                      setReplyDraft((prev) => ({ ...prev, [t.id]: v }))
                    }
                    onSent={() => {
                      setReplyDraft((prev) => ({ ...prev, [t.id]: '' }));
                      router.refresh();
                    }}
                  />
                ) : null}
              </section>
            </article>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border pt-4">
          {page > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={discussionListPath(projectId, {
                  ...listBase,
                  page: page - 1,
                })}
              >
                Sebelumnya
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Sebelumnya
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Halaman {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={discussionListPath(projectId, {
                  ...listBase,
                  page: page + 1,
                })}
              >
                Berikutnya
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Berikutnya
            </Button>
          )}
        </div>
      ) : null}

      <DiscussionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        projectId={projectId}
        canModerate={canModerate}
        thread={editingThread}
      />
    </div>
  );
}

function PinToggleButton(props: {
  projectId: string;
  thread: DiscussionThreadRow;
}) {
  const { projectId, thread } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1"
      disabled={pending}
      title={thread.pinned ? 'Lepas sematan' : 'Sematkan'}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set('projectId', projectId);
          fd.set('discussionId', thread.id);
          const r = await toggleDiscussionPinAction(fd);
          if (!r.ok) window.alert(r.error);
          else router.refresh();
        });
      }}
    >
      {thread.pinned ? (
        <PinOff className="h-3.5 w-3.5" />
      ) : (
        <Pin className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function DeleteThreadButton(props: {
  projectId: string;
  thread: DiscussionThreadRow;
}) {
  const { projectId, thread } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1 text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Hapus diskusi "${thread.title || 'tanpa judul'}" dan semua balasan?`,
          )
        )
          return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set('projectId', projectId);
          fd.set('discussionId', thread.id);
          const r = await deleteDiscussionAction(fd);
          if (!r.ok) window.alert(r.error);
          else router.refresh();
        });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function DeleteReplyButton(props: {
  projectId: string;
  replyId: string;
}) {
  const { projectId, replyId } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 text-xs text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm('Hapus balasan ini?')) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set('projectId', projectId);
          fd.set('replyId', replyId);
          const r = await deleteDiscussionReplyAction(fd);
          if (!r.ok) window.alert(r.error);
          else router.refresh();
        });
      }}
    >
      Hapus
    </Button>
  );
}

function ReplyComposer(props: {
  projectId: string;
  discussionId: string;
  draft: string;
  onDraftChange: (v: string) => void;
  onSent: () => void;
}) {
  const { projectId, discussionId, draft, onDraftChange, onSent } = props;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set('projectId', projectId);
    fd.set('discussionId', discussionId);
    fd.set('content', draft);
    startTransition(async () => {
      const r = await createDiscussionReplyAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onSent();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <Label htmlFor={`reply-${discussionId}`} className="text-xs">
        Balas (markdown ringan didukung)
      </Label>
      <Textarea
        id={`reply-${discussionId}`}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        rows={2}
        placeholder="Tulis balasan…"
        className="text-sm"
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={pending || !draft.trim()}
        onClick={submit}
      >
        {pending ? 'Mengirim…' : 'Kirim balasan'}
      </Button>
    </div>
  );
}

function ReplyEditForm(props: {
  projectId: string;
  reply: DiscussionReplyRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { projectId, reply, onCancel, onSaved } = props;
  const [text, setText] = useState(reply.content);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set('projectId', projectId);
    fd.set('replyId', reply.id);
    fd.set('content', text);
    startTransition(async () => {
      const r = await updateDiscussionReplyAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="text-sm"
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          Simpan
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </div>
  );
}
