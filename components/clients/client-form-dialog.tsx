'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  createClientAction,
  updateClientAction,
} from '@/app/actions/clients';
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
import type { ClientRow } from '@/lib/client-types';

type Mode = 'create' | 'edit';

export function ClientFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  client: ClientRow | null;
}) {
  const { open, onOpenChange, mode, client } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, mode, client?.id]);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const action =
        mode === 'create' ? createClientAction : updateClientAction;
      if (mode === 'edit' && client) {
        formData.set('id', client.id);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah klien' : 'Edit klien'}
          </DialogTitle>
          <DialogDescription>
            Data perusahaan dan kontak utama. Logo memakai URL gambar (opsional).
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="c-company">Nama perusahaan</Label>
            <Input
              id="c-company"
              name="companyName"
              required
              minLength={2}
              defaultValue={client?.companyName ?? ''}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="c-industry">Industri</Label>
              <Input
                id="c-industry"
                name="industry"
                placeholder="Mis. Fintech"
                defaultValue={client?.industry ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-status">Status</Label>
              <SelectNative
                id="c-status"
                name="status"
                required
                defaultValue={client?.status ?? 'active'}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </SelectNative>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="c-person">Kontak utama</Label>
              <Input
                id="c-person"
                name="contactPerson"
                defaultValue={client?.contactPerson ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-email">Email kontak</Label>
              <Input
                id="c-email"
                name="contactEmail"
                type="email"
                defaultValue={client?.contactEmail ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="c-phone">Telepon</Label>
            <Input
              id="c-phone"
              name="contactPhone"
              defaultValue={client?.contactPhone ?? ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="c-address">Alamat</Label>
            <Textarea
              id="c-address"
              name="address"
              rows={2}
              defaultValue={client?.address ?? ''}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="c-web">Website</Label>
              <Input
                id="c-web"
                name="website"
                type="url"
                placeholder="https://"
                defaultValue={client?.website ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-logo">URL logo</Label>
              <Input
                id="c-logo"
                name="logo"
                type="url"
                placeholder="https://"
                defaultValue={client?.logo ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="c-notes">Catatan</Label>
            <Textarea
              id="c-notes"
              name="notes"
              rows={3}
              defaultValue={client?.notes ?? ''}
            />
          </div>

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? 'Menyimpan…'
                : mode === 'create'
                  ? 'Simpan klien'
                  : 'Perbarui'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
