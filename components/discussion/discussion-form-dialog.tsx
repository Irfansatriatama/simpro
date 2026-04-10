'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  createDiscussionAction,
  updateDiscussionAction,
} from '@/app/actions/discussions';
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
import {
  DISCUSSION_TYPES,
  DISCUSSION_TYPE_LABEL,
} from '@/lib/discussion-constants';
import type { DiscussionThreadRow } from '@/lib/discussion-types';

type Mode = 'create' | 'edit';

export function DiscussionFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  projectId: string;
  canModerate: boolean;
  thread: DiscussionThreadRow | null;
}) {
  const { open, onOpenChange, mode, projectId, canModerate, thread } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, mode, thread?.id]);

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set('projectId', projectId);
    if (mode === 'edit' && thread) {
      formData.set('discussionId', thread.id);
    }
    if (!canModerate) {
      formData.delete('pinned');
      formData.set('pinned', '0');
    }
    startTransition(async () => {
      const action =
        mode === 'create' ? createDiscussionAction : updateDiscussionAction;
      const r = await action(formData);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Topik diskusi baru' : 'Edit diskusi'}
          </DialogTitle>
          <DialogDescription>
            Diskusi terlihat oleh semua yang punya akses proyek. Balasan dapat
            ditambahkan setelah topik dibuat.
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="d-title">Judul (opsional)</Label>
            <Input
              id="d-title"
              name="title"
              placeholder="Ringkasan singkat"
              defaultValue={thread?.title ?? ''}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="d-type">Tipe</Label>
            <SelectNative
              id="d-type"
              name="type"
              defaultValue={thread?.type ?? 'general'}
            >
              {DISCUSSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DISCUSSION_TYPE_LABEL[t]}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="d-content">Isi</Label>
            <p className="text-xs text-muted-foreground">
              Markdown ringan: judul (#), tebal (**), miring (*), tautan
              [label](https://…), daftar, kode `inline`.
            </p>
            <Textarea
              id="d-content"
              name="content"
              required
              minLength={2}
              rows={6}
              defaultValue={thread?.content ?? ''}
            />
          </div>
          {canModerate ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="pinned"
                value="1"
                defaultChecked={thread?.pinned ?? false}
                className="rounded border-border"
              />
              Sematkan di atas daftar
            </label>
          ) : (
            <input type="hidden" name="pinned" value="0" />
          )}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? 'Menyimpan…'
                : mode === 'create'
                  ? 'Publikasikan'
                  : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
