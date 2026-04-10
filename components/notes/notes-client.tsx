'use client';

import {
  BookOpen,
  Copy,
  FileDown,
  FileJson,
  FileText,
  FileType,
  FolderInput,
  FolderOpen,
  History,
  Maximize2,
  Minimize2,
  Pencil,
  Pin,
  Plus,
  Search,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
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
  createNoteFolderAction,
  deleteNoteAction,
  deleteNoteFolderAction,
  importMarkdownNoteAction,
  importNotesJsonAction,
  listNoteAuditsFormAction,
  recordNoteExportAuditAction,
  recordNoteViewedSharedAction,
  renameNoteFolderAction,
  setAllNoteSharesPermissionAction,
  shareNoteBatchAction,
  toggleNotePinAction,
  unshareNoteAction,
  updateNoteContentAction,
  updateNoteMetaAction,
} from '@/app/actions/notes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import {
  applyNoteFormat,
  type NoteFormatKey,
  NoteEditorToolbar,
} from '@/components/notes/note-editor-toolbar';
import { NoteMarkdownPreview } from '@/components/notes/note-markdown-preview';
import { NOTE_AUDIT_LABEL, NOTE_COLORS } from '@/lib/note-constants';
import type {
  NoteClientRow,
  NoteFolderRow,
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

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function NotesClient(props: {
  notes: NoteClientRow[];
  shareTargets: NoteShareTargetUser[];
  folders: NoteFolderRow[];
  currentUserId: string;
}) {
  const {
    notes: initialNotes,
    shareTargets,
    folders: initialFolders,
    currentUserId,
  } = props;
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [folders, setFolders] = useState(initialFolders);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialNotes[0]?.id ?? null,
  );
  const [search, setSearch] = useState('');
  const [folderListFilter, setFolderListFilter] = useState<
    'all' | 'none' | string
  >('all');
  const [newFolderName, setNewFolderName] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [colorPick, setColorPick] = useState<string>('#ffffff');
  const [folderPick, setFolderPick] = useState<string>('none');
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePickIds, setSharePickIds] = useState<Set<string>>(() => new Set());
  const [sharePerm, setSharePerm] = useState<'view' | 'edit'>('view');
  const [audits, setAudits] = useState<
    { id: string; action: string; actorName: string; createdAt: string }[]
  >([]);
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'history'>(
    'edit',
  );
  const [editorFs, setEditorFs] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNoteSyncKey = useRef<string | null>(null);
  const notesRef = useRef(notes);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mdImportInputRef = useRef<HTMLInputElement>(null);
  const editorPanelRef = useRef<HTMLDivElement>(null);
  notesRef.current = notes;

  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    setEditorMode('edit');
  }, [selectedId]);

  useEffect(() => {
    const onFs = () => {
      setEditorFs(
        Boolean(document.fullscreenElement === editorPanelRef.current),
      );
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const row = notesRef.current.find((n) => n.id === selectedId);
    if (!row || row.access === 'owner') return;
    const fd = new FormData();
    fd.set('noteId', selectedId);
    startTransition(() => {
      void recordNoteViewedSharedAction(fd);
    });
  }, [selectedId]);

  useEffect(() => {
    if (editorMode !== 'history' || !selectedId) return;
    const row = notesRef.current.find((n) => n.id === selectedId);
    if (!row || row.access !== 'owner') return;
    const fd = new FormData();
    fd.set('noteId', selectedId);
    startTransition(async () => {
      const r = await listNoteAuditsFormAction(fd);
      if (r.ok && r.data) setAudits(r.data.entries);
    });
  }, [editorMode, selectedId]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  useEffect(() => {
    if (!shareOpen || !selected || selected.access !== 'owner') return;
    setSharePerm(selected.shareDefaultPermission);
    setSharePickIds(new Set());
  }, [shareOpen, selected]);

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
    setFolderPick(n.folderId ?? 'none');
  }, [selectedId, notes]);

  const flushSave = useCallback(() => {
    if (!selectedId) return;
    const row = notesRef.current.find((x) => x.id === selectedId);
    if (!row || row.access === 'shared_view') return;
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
  }, [selectedId, localTitle, localContent]);

  useEffect(() => {
    if (!selectedId) return;
    const row = notesRef.current.find((x) => x.id === selectedId);
    if (!row || row.access === 'shared_view') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      flushSave();
    }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [localTitle, localContent, selectedId, flushSave]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = notes.filter((n) => {
      if (folderListFilter === 'none') {
        if (n.folderId) return false;
      } else if (folderListFilter !== 'all') {
        if (n.folderId !== folderListFilter) return false;
      }
      if (!q) return true;
      const blob = [
        n.title,
        n.content,
        n.tags.join(' '),
        n.ownerName,
        n.folderName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
    arr.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
    return arr;
  }, [notes, search, folderListFilter]);

  const listFilterActiveCount = useMemo(() => {
    let n = 0;
    if (search.trim()) n++;
    if (folderListFilter !== 'all') n++;
    return n;
  }, [search, folderListFilter]);

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
    const id = selected.id;
    const nextPinned = !selected.pinned;
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: nextPinned } : n)),
    );
    const fd = new FormData();
    fd.set('id', id);
    startTransition(async () => {
      const r = await toggleNotePinAction(fd);
      if (!r.ok) {
        window.alert(r.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!selected || selected.access !== 'owner') return;
    if (!window.confirm('Hapus catatan ini?')) return;
    const deadId = selected.id;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', deadId);
      const r = await deleteNoteAction(fd);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      const rest = notesRef.current.filter((n) => n.id !== deadId);
      setNotes(rest);
      setSelectedId(rest[0]?.id ?? null);
      lastNoteSyncKey.current = null;
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
    fd.set('folderId', folderPick === 'none' ? 'none' : folderPick);
    startTransition(async () => {
      const r = await updateNoteMetaAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  function onSharePermChange(next: 'view' | 'edit') {
    setSharePerm(next);
    if (!selected || selected.access !== 'owner') return;
    if (selected.sharedWith.length === 0) return;
    const fd = new FormData();
    fd.set('noteId', selected.id);
    fd.set('permission', next);
    startTransition(async () => {
      const r = await setAllNoteSharesPermissionAction(fd);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });
  }

  function onShareBatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || selected.access !== 'owner' || sharePickIds.size === 0)
      return;
    const fd = new FormData();
    fd.set('noteId', selected.id);
    fd.set('permission', sharePerm);
    fd.set('userIds', JSON.stringify(Array.from(sharePickIds)));
    startTransition(async () => {
      const r = await shareNoteBatchAction(fd);
      if (!r.ok) window.alert(r.error);
      else {
        setSharePickIds(new Set());
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

  function onCreateFolderSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    const fd = new FormData();
    fd.set('name', name);
    startTransition(async () => {
      const r = await createNoteFolderAction(fd);
      if (!r.ok) window.alert(r.error);
      else {
        setNewFolderName('');
        router.refresh();
      }
    });
  }

  function onDeleteFolder(folderId: string, folderName: string) {
    if (!window.confirm(`Hapus folder "${folderName}"? Catatan di dalamnya tidak dihapus.`))
      return;
    const fd = new FormData();
    fd.set('id', folderId);
    startTransition(async () => {
      const r = await deleteNoteFolderAction(fd);
      if (!r.ok) window.alert(r.error);
      else {
        if (folderListFilter === folderId) setFolderListFilter('all');
        router.refresh();
      }
    });
  }

  const ownedNotes = useMemo(
    () => notes.filter((n) => n.access === 'owner'),
    [notes],
  );

  const wordCharStats = useMemo(() => {
    const t = localContent.trim();
    const words = t ? t.split(/\s+/).filter((w) => w.length > 0).length : 0;
    return { words, chars: localContent.length };
  }, [localContent]);

  function exportOwnedJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      app: 'simpro',
      version: 1,
      user_id: currentUserId,
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        sortOrder: f.sortOrder,
      })),
      notes: ownedNotes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        folderId: n.folderId,
        folder_id: n.folderId,
        pinned: n.pinned,
        color: n.color,
        tags: n.tags,
        sharePermission: n.shareDefaultPermission,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const day = new Date().toISOString().slice(0, 10);
    triggerDownload(`simpro-notes-${day}.json`, blob);
  }

  function exportOwnedMdBundle() {
    const sorted = [...ownedNotes].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    let md = '';
    for (const n of sorted) {
      const t = n.title?.trim() || 'Tanpa judul';
      md += `# ${t}\n\n${n.content}\n\n---\n\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    triggerDownload(
      `simpro-notes-${new Date().toISOString().slice(0, 10)}.md`,
      blob,
    );
  }

  function downloadSingleMd() {
    if (!selected || selected.access !== 'owner') return;
    const head = localTitle.trim() ? `# ${localTitle.trim()}\n\n` : '';
    const blob = new Blob([head + localContent], {
      type: 'text/markdown;charset=utf-8',
    });
    const safe = (localTitle.trim() || selected.id)
      .replace(/[/\\?%*:|"<>]/g, '-')
      .slice(0, 60);
    triggerDownload(`${safe}.md`, blob);
    const fd = new FormData();
    fd.set('noteId', selected.id);
    startTransition(async () => {
      await recordNoteExportAuditAction(fd);
    });
  }

  function onRenameFolderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!renameFolder || !renameFolder.name.trim()) return;
    const fd = new FormData();
    fd.set('id', renameFolder.id);
    fd.set('name', renameFolder.name.trim());
    startTransition(async () => {
      const r = await renameNoteFolderAction(fd);
      if (!r.ok) window.alert(r.error);
      else {
        setRenameFolder(null);
        router.refresh();
      }
    });
  }

  const readOnly = selected?.access === 'shared_view';

  function applyFormatKey(key: NoteFormatKey) {
    const el = contentTextareaRef.current;
    if (!el || readOnly || editorMode !== 'edit') return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const r = applyNoteFormat(key, localContent, start, end);
    setLocalContent(r.value);
    requestAnimationFrame(() => {
      el.setSelectionRange(r.start, r.end);
      el.focus();
    });
  }

  function onContentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (readOnly || editorMode !== 'edit') return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      applyFormatKey('bold');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      applyFormatKey('italic');
      return;
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      (e.key === 'x' || e.key === 'X')
    ) {
      e.preventDefault();
      applyFormatKey('strikethrough');
    }
  }

  async function copyNoteMarkdown() {
    if (!selected) return;
    const head = localTitle.trim() ? `# ${localTitle.trim()}\n\n` : '';
    try {
      await navigator.clipboard.writeText(head + localContent);
    } catch {
      window.alert('Gagal menyalin ke papan klip.');
    }
  }

  async function toggleEditorFullscreen() {
    const el = editorPanelRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* abaikan */
    }
  }

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
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            className="min-w-0 flex-1 gap-2 sm:flex-initial"
            onClick={onCreate}
            disabled={pending}
          >
            <Plus className="h-4 w-4" />
            Catatan baru
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={pending || ownedNotes.length === 0}
                title="Hanya catatan milik Anda"
              >
                <FileDown className="h-4 w-4" />
                Ekspor
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => exportOwnedJson()}
              >
                <FileJson className="h-4 w-4" />
                JSON (backup / impor ulang)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => exportOwnedMdBundle()}
              >
                <FileText className="h-4 w-4" />
                Markdown gabungan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setImportOpen(true)}
            disabled={pending}
          >
            <Upload className="h-4 w-4" />
            Impor JSON
          </Button>
          <input
            ref={mdImportInputRef}
            type="file"
            accept=".md,.txt,text/markdown,text/plain"
            className="hidden"
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void (async () => {
                const fd = new FormData();
                fd.set('file', file);
                const fdFolder =
                  folderListFilter !== 'all' && folderListFilter !== 'none'
                    ? folderListFilter
                    : 'none';
                fd.set('folderId', fdFolder);
                const r = await importMarkdownNoteAction(fd);
                if (!r.ok) {
                  window.alert(r.error);
                  e.target.value = '';
                  return;
                }
                if (r.id) setSelectedId(r.id);
                setEditorMode('edit');
                router.refresh();
                e.target.value = '';
              })();
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => mdImportInputRef.current?.click()}
            disabled={pending}
            title="Buat catatan baru dari berkas .md atau .txt"
          >
            <FileType className="h-4 w-4" />
            Impor .md
          </Button>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FilterPanelSheet
            title="Cari & filter daftar"
            activeCount={listFilterActiveCount}
            triggerClassName="flex-1 sm:flex-none"
          >
            <FilterField label="Cari">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Judul, isi, tag…"
                  className="pl-9"
                  aria-label="Cari catatan"
                />
              </div>
            </FilterField>
            <FilterField label="Folder">
              <SelectNative
                value={folderListFilter}
                onChange={(e) =>
                  setFolderListFilter(e.target.value as 'all' | 'none' | string)
                }
                className="w-full"
              >
                <option value="all">Semua catatan</option>
                <option value="none">Tanpa folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </SelectNative>
            </FilterField>
          </FilterPanelSheet>
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
                      {n.folderName ? (
                        <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                          <FolderOpen className="h-3 w-3" />
                          {n.folderName}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <FolderInput className="h-3.5 w-3.5" />
            Kelola folder
          </p>
          <form
            onSubmit={onCreateFolderSubmit}
            className="mb-3 flex gap-2"
          >
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nama folder baru"
              maxLength={80}
              className="flex-1 text-sm"
              disabled={pending}
            />
            <Button type="submit" size="sm" disabled={pending}>
              Tambah
            </Button>
          </form>
          {folders.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Belum ada folder. Buat untuk mengelompokkan catatan Anda.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {folders.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/80 px-2 py-1.5"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left hover:text-primary"
                    onClick={() => setFolderListFilter(f.id)}
                  >
                    {f.name}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    aria-label={`Ganti nama folder ${f.name}`}
                    onClick={() =>
                      setRenameFolder({ id: f.id, name: f.name })
                    }
                    disabled={pending}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Hapus folder ${f.name}`}
                    onClick={() => onDeleteFolder(f.id, f.name)}
                    disabled={pending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section
        ref={editorPanelRef}
        className={cn(
          'flex min-h-[320px] flex-1 flex-col border-border lg:border-l lg:pl-4',
          editorFs && 'bg-background',
        )}
      >
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

            {!readOnly ? (
              <div
                className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5"
                role="tablist"
                aria-label="Mode editor"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={editorMode === 'edit' ? 'default' : 'ghost'}
                  className="h-8"
                  aria-pressed={editorMode === 'edit'}
                  onClick={() => setEditorMode('edit')}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={editorMode === 'preview' ? 'default' : 'ghost'}
                  className="h-8 gap-1"
                  aria-pressed={editorMode === 'preview'}
                  onClick={() => setEditorMode('preview')}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Baca
                </Button>
                {selected.access === 'owner' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={editorMode === 'history' ? 'default' : 'ghost'}
                    className="h-8 gap-1"
                    aria-pressed={editorMode === 'history'}
                    onClick={() => setEditorMode('history')}
                  >
                    <History className="h-3.5 w-3.5" />
                    Riwayat
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void copyNoteMarkdown()}
                title="Salin judul dan isi sebagai Markdown"
              >
                <Copy className="h-3.5 w-3.5" />
                Salin MD
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void toggleEditorFullscreen()}
                title="Layar penuh panel editor"
              >
                {editorFs ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
                {editorFs ? 'Keluar' : 'Layar penuh'}
              </Button>
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
                    onClick={downloadSingleMd}
                    disabled={pending}
                    title="Unduh catatan ini sebagai .md (tersimpan di riwayat)"
                  >
                    <FileDown className="mr-1.5 h-3.5 w-3.5" />
                    Unduh .md
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
                    : readOnly || editorMode === 'history'
                      ? ''
                      : editorMode === 'edit'
                        ? 'Otomatis simpan'
                        : ''}
              </span>
            </div>

            {editorMode !== 'history' ? (
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="Judul (opsional)"
                disabled={readOnly || editorMode === 'preview'}
                className="text-lg font-medium"
              />
            ) : null}
            {editorMode === 'history' && selected.access === 'owner' ? (
              <div className="max-h-[min(60vh,520px)] overflow-y-auto rounded-lg border border-border bg-card/40 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Aktivitas (maks. 100 entri)
                </p>
                <ul className="space-y-2 text-sm">
                  {audits.length === 0 ? (
                    <li className="text-muted-foreground">
                      Belum ada riwayat aktivitas.
                    </li>
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
              </div>
            ) : readOnly || editorMode === 'preview' ? (
              <NoteMarkdownPreview markdown={localContent} />
            ) : (
              <>
                <NoteEditorToolbar
                  disabled={readOnly}
                  value={localContent}
                  onChange={setLocalContent}
                  textareaRef={contentTextareaRef}
                />
                <Textarea
                  ref={contentTextareaRef}
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  onKeyDown={onContentKeyDown}
                  placeholder="Tulis di sini… (Markdown: gunakan toolbar di atas)"
                  disabled={readOnly}
                  className="min-h-[240px] flex-1 resize-y font-mono text-sm lg:min-h-[360px]"
                />
              </>
            )}
            {editorMode !== 'history' ? (
              <p className="text-right font-mono text-[11px] text-muted-foreground">
                {wordCharStats.words} kata · {wordCharStats.chars} karakter
              </p>
            ) : null}

            {selected.access === 'owner' ? (
              <form
                onSubmit={onSaveMeta}
                className="space-y-3 rounded-lg border border-border bg-card p-4"
              >
                <p className="text-sm font-medium text-foreground">
                  Folder, tag &amp; warna
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="note-folder">Folder</Label>
                    <SelectNative
                      id="note-folder"
                      value={folderPick}
                      onChange={(e) => setFolderPick(e.target.value)}
                    >
                      <option value="none">Tanpa folder</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
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
              {shareTargets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada pengguna aktif lain di sistem untuk dibagikan.
                  Undang anggota tim terlebih dahulu.
                </p>
              ) : (
                <form onSubmit={onShareBatch} className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="share-perm">Izin untuk penerima</Label>
                    <SelectNative
                      id="share-perm"
                      value={sharePerm}
                      onChange={(e) =>
                        onSharePermChange(e.target.value as 'view' | 'edit')
                      }
                      className="w-full"
                    >
                      <option value="view">Hanya lihat</option>
                      <option value="edit">Lihat &amp; ubah</option>
                    </SelectNative>
                    {selected.sharedWith.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Mengubah izin di sini menerapkan ke semua yang sudah
                        punya akses.
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label>Tambahkan anggota</Label>
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                      {shareTargets.filter(
                        (u) =>
                          !selected.sharedWith.some((s) => s.userId === u.id),
                      ).length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Semua anggota yang tersedia sudah punya akses.
                        </p>
                      ) : (
                        shareTargets
                          .filter(
                            (u) =>
                              !selected.sharedWith.some(
                                (s) => s.userId === u.id,
                              ),
                          )
                          .map((u) => (
                            <label
                              key={u.id}
                              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                checked={sharePickIds.has(u.id)}
                                onChange={() => {
                                  setSharePickIds((prev) => {
                                    const n = new Set(prev);
                                    if (n.has(u.id)) n.delete(u.id);
                                    else n.add(u.id);
                                    return n;
                                  });
                                }}
                                className="rounded border-border"
                              />
                              <span>
                                {u.name}{' '}
                                <span className="text-muted-foreground">
                                  ({u.username})
                                </span>
                              </span>
                            </label>
                          ))
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={pending || sharePickIds.size === 0}
                    >
                      Tambahkan terpilih
                    </Button>
                  </DialogFooter>
                </form>
              )}
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

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Impor catatan (JSON)</DialogTitle>
            <DialogDescription>
              Unggah berkas dari ekspor SIMPRO atau paket dengan kunci{' '}
              <code className="rounded bg-muted px-1 text-xs">notes</code> dan{' '}
              <code className="rounded bg-muted px-1 text-xs">folders</code>{' '}
              (kompatibel dengan backup Trackly). ID catatan yang sudah ada di
              basis data akan dilewati.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="notes-import-file" className="sr-only">
              Berkas JSON
            </Label>
            <Input
              id="notes-import-file"
              type="file"
              accept=".json,application/json"
              className="cursor-pointer text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void (async () => {
                  try {
                    const text = await file.text();
                    const fd = new FormData();
                    fd.set('json', text);
                    const r = await importNotesJsonAction(fd);
                    if (!r.ok) {
                      window.alert(r.error);
                      return;
                    }
                    if (r.data) {
                      window.alert(
                        `Impor selesai.\n• ${r.data.imported} catatan baru\n• ${r.data.skipped} dilewati\n• ${r.data.foldersTouched} folder baru`,
                      );
                    }
                    setImportOpen(false);
                    router.refresh();
                  } catch {
                    window.alert('Gagal membaca berkas.');
                  }
                  e.target.value = '';
                })();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameFolder !== null}
        onOpenChange={(v) => {
          if (!v) setRenameFolder(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ganti nama folder</DialogTitle>
          </DialogHeader>
          {renameFolder ? (
            <form onSubmit={onRenameFolderSubmit} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="rename-folder-input">Nama</Label>
                <Input
                  id="rename-folder-input"
                  value={renameFolder.name}
                  onChange={(e) =>
                    setRenameFolder((prev) =>
                      prev ? { ...prev, name: e.target.value } : null,
                    )
                  }
                  maxLength={80}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRenameFolder(null)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={pending}>
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
