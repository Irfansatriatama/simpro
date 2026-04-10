'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  createAssetAction,
  updateAssetAction,
} from '@/app/actions/assets';
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
import { CloudinaryImageField } from '@/components/uploads/cloudinary-image-field';
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABEL,
  ASSET_STATUSES,
  ASSET_STATUS_LABEL,
} from '@/lib/asset-constants';
import type { AssetProjectPick, AssetRow, AssetUserPick } from '@/lib/asset-types';

type Mode = 'create' | 'edit';

function dateInputValue(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export function AssetFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  asset: AssetRow | null;
  projects: AssetProjectPick[];
  users: AssetUserPick[];
}) {
  const { open, onOpenChange, mode, asset, projects, users } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, mode, asset?.id]);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const action =
        mode === 'create' ? createAssetAction : updateAssetAction;
      if (mode === 'edit' && asset) {
        formData.set('id', asset.id);
      }
      const r = await action(formData);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const a = mode === 'edit' ? asset : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah aset' : 'Edit aset'}
          </DialogTitle>
          <DialogDescription>
            Inventaris perusahaan; opsional taut ke proyek dan penanggung jawab.
            Foto aset diunggah ke Cloudinary (opsional).
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="asset-name">Nama aset</Label>
              <Input
                id="asset-name"
                name="name"
                required
                minLength={2}
                defaultValue={a?.name ?? ''}
                placeholder="Mis. MacBook Pro 16&quot;"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-category">Kategori</Label>
              <SelectNative
                id="asset-category"
                name="category"
                defaultValue={a?.category ?? 'hardware'}
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {ASSET_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-status">Status</Label>
              <SelectNative
                id="asset-status"
                name="status"
                defaultValue={a?.status ?? 'available'}
              >
                {ASSET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ASSET_STATUS_LABEL[s]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-serial">Nomor seri</Label>
              <Input
                id="asset-serial"
                name="serialNumber"
                defaultValue={a?.serialNumber ?? ''}
                placeholder="Opsional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-vendor">Vendor</Label>
              <Input
                id="asset-vendor"
                name="vendor"
                defaultValue={a?.vendor ?? ''}
                placeholder="Opsional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-purchase-date">Tanggal beli</Label>
              <Input
                id="asset-purchase-date"
                name="purchaseDate"
                type="date"
                defaultValue={dateInputValue(a?.purchaseDate ?? null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-price">Harga beli</Label>
              <Input
                id="asset-price"
                name="purchasePrice"
                type="text"
                inputMode="decimal"
                defaultValue={
                  a?.purchasePrice != null ? String(a.purchasePrice) : ''
                }
                placeholder="Opsional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-warranty">Garansi hingga</Label>
              <Input
                id="asset-warranty"
                name="warrantyExpiry"
                type="date"
                defaultValue={dateInputValue(a?.warrantyExpiry ?? null)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="asset-project">Proyek</Label>
              <SelectNative
                id="asset-project"
                name="projectId"
                defaultValue={a?.projectId ?? ''}
              >
                <option value="">— Tidak ditautkan —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="asset-assignee">Penanggung jawab</Label>
              <SelectNative
                id="asset-assignee"
                name="assignedTo"
                defaultValue={a?.assignedTo ?? ''}
              >
                <option value="">— Belum ditugaskan —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.username})
                  </option>
                ))}
              </SelectNative>
            </div>
            <CloudinaryImageField
              className="sm:col-span-2"
              name="image"
              label="Foto aset"
              defaultUrl={a?.image}
            />
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="asset-desc">Deskripsi</Label>
              <Textarea
                id="asset-desc"
                name="description"
                rows={2}
                defaultValue={a?.description ?? ''}
                placeholder="Ringkasan singkat"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="asset-notes">Catatan</Label>
              <Textarea
                id="asset-notes"
                name="notes"
                rows={2}
                defaultValue={a?.notes ?? ''}
                placeholder="Opsional"
              />
            </div>
          </div>

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
              {pending ? 'Menyimpan…' : mode === 'create' ? 'Simpan' : 'Perbarui'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
