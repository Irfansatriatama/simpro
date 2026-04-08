'use client';

import { FileText, Pin, Plus, Search, Share2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import {
  createNoteAction,
  deleteNoteAction,
  listNoteAuditsAction,
  shareNoteAction,
  toggleNotePinAction,
  unshareNoteAction,
  updateNoteContentAction,
  updateNoteMetaAction,
} from '@/app/actions/notes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import { NOTE_AUDIT_LABEL, NOTE_COLORS } from '@/lib/note-constants';
import type {
  NoteClientRow,
  NoteShareTargetUser,
} from '@/lib/note-types';
import { cn } from '@/lib/utils';

function fmtShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function previewLine(note: NoteClientRow): string {
  const t = note.title?.trim();
  if (t) return t.length > 72 ? `${t.slice(0, 72)}…` : t;
  const line = note.content.split('\n').find((l) => l.trim());
  if (!line) return 'Catatan kosong';
  const x = line.trim();
  return x.length > 72 ? `${x.slice(0, 72)}…` : x;
}

export function NotesClient(props: {
  notes: NoteClientRow[];
  shareTargets: NoteShareTargetUser[];
}) {
  const { notes: initialNotes, shareTargets } = props;
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialNotes[0]?.id ?? null,
  );
  const [search, setSearch] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [colorPick, setColorPick] = useState<string>('#ffffff');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUserId, setShareUserId] = useState('');
  const [sharePerm, setSharePerm] = useState<'view' | 'edit'>('view');
  const [auditOpen, setAuditOpen] = useState(false);
  const [audits, setAudits] = useState<
    { id: string; action: string; actorName: string; createdAt: string }[]
  >([]);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNoteSyncKey = useRef<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setLocalTitle('');
      setLocalContent('');
      setTagsInput('');
      setColorPick('#ffffff');
      lastNoteSyncKey.current = null;
      return;
    }
    const n = notes.find((x) => x.id === selectedId);
    if (!n) return;
    const key = `${n.id}:${n.updatedAt}`;
    if (lastNoteSyncKey.current === key) return;
    lastNoteSyncKey.current = key;
    setLocalTitle(n.title ?? '');
    setLocalContent(n.content);
    setTagsInput(n.tags.join(', '));
    setColorPick(n.color ?? '#ffffff');
  }, [selectedId, notes]);

  const flushSave = useCallback(() => {
    if (!selectedId || !selected) return;
    if (selected.access === 'shared_view') return;
    const fd = new FormData();
    fd.set('id', selectedId);
    fd.set('title', localTitle);
    fd.set('content', localContent);
    setSaveState('saving');
    startTransition(async () => {
      const r = await updateNoteContentAction(fd);
      if (!r.ok) {
        window.alert(r.error);
        setSaveState('idle');
        return;
      }
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedId
            ? {
                ...n,
                title: localTitle.trim()
                  ? localTitle.trim().slice(0, 500)
                  : null,
                content: localContent,
                updatedAt: new Date().toISOString(),
              }
            : n,
        ),
      );
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1200);
    });
  }, [selectedId, selected, localTitle, localContent]);

  useEffect(() => {
    if (!selectedId || !selected) return;
    if (selected.access === 'shared_view') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      flushSave();
    }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [localTitle, localContent, selectedId, selected, flushSave]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const blob = [
        n.title,
        n.content,
        n.tags.join(' '),
        n.ownerName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [notes, search]);

  function onCreate() {
    startTransition(async () => {
      const r = await createNoteAction();
      if (!r.ok || !r.id) {
        window.alert(r.ok ? 'Gagal membuat catatan.' : r.error);
        return;
      }
      setSelectedId(r.id);
      router.refresh();
    });
  }

  function onTogglePin() {
    if (!selected || selected.access !== 'owner') return;
    const fd = new FormData();
    fd.set('id', selected.id);
    startTransition(async () => {
      const r = await toggleNotePinAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  function onDelete() {
    if (!selected || selected.access !== 'owner') return;
    if (!window.confirm('Hapus catatan ini?')) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', selected.id);
      const r = await deleteNoteAction(fd);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      setSelectedId(null);
      router.refresh();
    });
  }

  function onSaveMeta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || selected.access !== 'owner') return;
    const fd = new FormData();
    fd.set('id', selected.id);
    fd.set('tags', tagsInput);
    fd.set('color', colorPick === '#ffffff' ? 'none' : colorPick);
    startTransition(async () => {
      const r = await updateNoteMetaAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  function onShare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || selected.access !== 'owner' || !shareUserId) return;
    const fd = new FormData();
    fd.set('noteId', selected.id);
    fd.set('targetUserId', shareUserId);
    fd.set('permission', sharePerm);
    startTransition(async () => {
      const r = await shareNoteAction(fd);
      if (!r.ok) window.alert(r.error);
      else {
        setShareUserId('');
        router.refresh();
      }
    });
  }

  function revokeShare(userId: string) {
    if (!selected || selected.access !== 'owner') return;
    const fd = new FormData();
    fd.set('noteId', selected.id);
    fd.set('targetUserId', userId);
    startTransition(async () => {
      const r = await unshareNoteAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  function loadAudits() {
    if (!selected || selected.access !== 'owner') return;
    startTransition(async () => {
      const r = await listNoteAuditsAction(selected.id);
      if (!r.ok || !r.data) {
        window.alert(r.ok ? 'Kosong.' : r.error);
        return;
      }
      setAudits(r.data.entries);
      setAuditOpen(true);
    });
  }

  const readOnly = selected?.access === 'shared_view';

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row lg:gap-0">
      <aside className="flex w-full flex-col border-border lg:w-[min(100%,320px)] lg:border-r lg:pr-4">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Catatan pribadi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hanya Anda (dan yang dibagikan) yang melihat isi catatan.
          </p>
        </div>
        <div className="mb-3 flex gap-2">
          <Button
            type="button"
            className="flex-1 gap-2"
            onClick={onCreate}
            disabled={pending}
          >
            <Plus className="h-4 w-4" />
            Catatan baru
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari…"
            className="pl-9"
            aria-label="Cari catatan"
          />
        </div>
        <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto lg:max-h-none lg:flex-1">
          {filtered.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Tidak ada catatan.
            </li>
          ) : (
            filtered.map((n) => {
              const active = n.id === selectedId;
              const border =
                n.color && n.color !== '#ffffff'
                  ? n.color
                  : 'var(--border)';
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(n.id)}
                    className={cn(
                      'w-full rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-surface/80',
                    )}
                    style={{ borderLeftWidth: 4, borderLeftColor: border }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 font-medium text-foreground">
                        {previewLine(n)}
                      </span>
                      {n.pinned ? (
                        <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{fmtShort(n.updatedAt)}</span>
                      {n.access !== 'owner' ? (
                        <span className="rounded bg-border/60 px-1.5 py-0.5">
                          Dari {n.ownerName}
                        </span>
                      ) : null}
                      {n.sharedWith.length > 0 ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Share2 className="h-3 w-3" />
                          {n.sharedWith.length}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section className="flex min-h-[320px] flex-1 flex-col border-border lg:border-l lg:pl-4">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/30 py-16 text-center text-muted-foreground">
            <FileText className="h-10 w-10 opacity-40" />
            <p>Pilih catatan di kiri atau buat yang baru.</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            {readOnly ? (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Anda hanya memiliki akses <strong>lihat</strong> untuk
                catatan ini.
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {selected.access === 'owner' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onTogglePin}
                    disabled={pending}
                  >
                    <Pin className="mr-1.5 h-3.5 w-3.5" />
                    {selected.pinned ? 'Lepas semat' : 'Sematkan'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShareOpen(true)}
                    disabled={pending}
                  >
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    Bagikan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadAudits}
                    disabled={pending}
                  >
                    Riwayat
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={onDelete}
                    disabled={pending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Hapus
                  </Button>
                </>
              ) : null}
              <span className="ml-auto text-xs text-muted-foreground">
                {saveState === 'saving'
                  ? 'Menyimpan…'
                  : saveState === 'saved'
                    ? 'Tersimpan'
                    : readOnly
                      ? ''
                      : 'Otomatis simpan'}
              </span>
            </div>

            <Input
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="Judul (opsional)"
              disabled={readOnly}
              className="text-lg font-medium"
            />
            <Textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              placeholder="Tulis di sini… (teks biasa / Markdown bebas)"
              disabled={readOnly}
              className="min-h-[240px] flex-1 resize-y font-mono text-sm lg:min-h-[360px]"
            />

            {selected.access === 'owner' ? (
              <form
                onSubmit={onSaveMeta}
                className="space-y-3 rounded-lg border border-border bg-card p-4"
              >
                <p className="text-sm font-medium text-foreground">
                  Tag &amp; warna
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="note-tags">Tag (pisahkan koma)</Label>
                    <Input
                      id="note-tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="urgent, ide, …"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="note-color">Warna kartu</Label>
                    <SelectNative
                      id="note-color"
                      value={colorPick}
                      onChange={(e) => setColorPick(e.target.value)}
                    >
                      {NOTE_COLORS.map((c) => (
                        <option key={c} value={c}>
                          {c === '#ffffff' ? 'Default' : c}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={pending}>
                  Simpan tag &amp; warna
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </section>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bagikan catatan</DialogTitle>
            <DialogDescription>
              Undang anggota aktif lain. Izin ubah memungkinkan mereka mengedit
              isi seperti Anda.
            </DialogDescription>
          </DialogHeader>
          {selected && selected.access === 'owner' ? (
            <>
              <form onSubmit={onShare} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="share-user">Pengguna</Label>
                  <SelectNative
                    id="share-user"
                    value={shareUserId}
                    onChange={(e) => setShareUserId(e.target.value)}
                    required
                  >
                    <option value="">— Pilih —</option>
                    {shareTargets.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.username})
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="share-perm">Izin</Label>
                  <SelectNative
                    id="share-perm"
                    value={sharePerm}
                    onChange={(e) =>
                      setSharePerm(e.target.value as 'view' | 'edit')
                    }
                  >
                    <option value="view">Hanya lihat</option>
                    <option value="edit">Lihat &amp; ubah</option>
                  </SelectNative>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={pending || !shareUserId}>
                    Bagikan
                  </Button>
                </DialogFooter>
              </form>
              {selected.sharedWith.length > 0 ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-sm font-medium">Sudah dibagikan</p>
                  <ul className="space-y-2 text-sm">
                    {selected.sharedWith.map((s) => (
                      <li
                        key={s.userId}
                        className="flex items-center justify-between gap-2 rounded-md bg-surface/60 px-2 py-1.5"
                      >
                        <span>
                          {s.userName}{' '}
                          <span className="text-muted-foreground">
                            ({s.permission === 'edit' ? 'ubah' : 'lihat'})
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => revokeShare(s.userId)}
                          disabled={pending}
                        >
                          Cabut
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Riwayat catatan</DialogTitle>
            <DialogDescription>
              Aktivitas tercatat untuk pemilik (maks. 100 entri terbaru).
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto text-sm">
            {audits.length === 0 ? (
              <li className="text-muted-foreground">Belum ada riwayat.</li>
            ) : (
              audits.map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border border-border px-2 py-1.5"
                >
                  <span className="font-medium text-foreground">
                    {a.actorName}
                  </span>{' '}
                  <span className="text-muted-foreground">
                    — {NOTE_AUDIT_LABEL[a.action] ?? a.action}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {fmtShort(a.createdAt)}{' '}
                    {new Date(a.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
