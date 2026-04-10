'use client';

import { UserRole, UserStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  createMemberAction,
  updateMemberAction,
} from '@/app/actions/members';
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
import type { MemberRow } from '@/lib/members-types';

type Mode = 'create' | 'edit';

export function MemberFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  member: MemberRow | null;
}) {
  const { open, onOpenChange, mode, member } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, mode, member?.id]);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const action =
        mode === 'create' ? createMemberAction : updateMemberAction;
      if (mode === 'edit' && member) {
        formData.set('id', member.id);
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
            {mode === 'create' ? 'Tambah anggota' : 'Edit anggota'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Buat akun login dengan username/email dan password.'
              : 'Perbarui profil dan peran. Setelah nonaktif, sesi pengguna dihapus.'}
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="m-name">Nama lengkap</Label>
            <Input
              id="m-name"
              name="name"
              required
              minLength={2}
              defaultValue={member?.name ?? ''}
              autoComplete="name"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="m-email">Email</Label>
              <Input
                id="m-email"
                name="email"
                type="email"
                required
                defaultValue={member?.email ?? ''}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-username">Username</Label>
              <Input
                id="m-username"
                name="username"
                required
                minLength={3}
                defaultValue={member?.username ?? ''}
                autoComplete="username"
              />
            </div>
          </div>

          {mode === 'create' ? (
            <div className="grid gap-2">
              <Label htmlFor="m-password">Password awal</Label>
              <Input
                id="m-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          ) : null}

          {mode === 'edit' ? (
            <div className="grid gap-2">
              <Label htmlFor="m-displayUsername">Nama tampilan (opsional)</Label>
              <Input
                id="m-displayUsername"
                name="displayUsername"
                placeholder={member?.username ?? ''}
                defaultValue={member?.displayUsername ?? ''}
              />
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="m-role">Peran</Label>
              <SelectNative
                id="m-role"
                name="role"
                required
                defaultValue={member?.role ?? UserRole.developer}
              >
                <option value={UserRole.admin}>Administrator</option>
                <option value={UserRole.pm}>Project Manager</option>
                <option value={UserRole.developer}>Developer</option>
                <option value={UserRole.viewer}>Viewer</option>
                <option value={UserRole.client}>Klien</option>
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-status">Status</Label>
              <SelectNative
                id="m-status"
                name="status"
                required
                defaultValue={member?.status ?? UserStatus.active}
              >
                <option value={UserStatus.active}>Aktif</option>
                <option value={UserStatus.inactive}>Nonaktif</option>
                <option value={UserStatus.invited}>Diundang</option>
              </SelectNative>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="m-phone">Telepon</Label>
              <Input
                id="m-phone"
                name="phoneNumber"
                defaultValue={member?.phoneNumber ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-position">Jabatan</Label>
              <Input
                id="m-position"
                name="position"
                defaultValue={member?.position ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="m-company">Perusahaan</Label>
              <Input
                id="m-company"
                name="company"
                defaultValue={member?.company ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-dept">Departemen</Label>
              <Input
                id="m-dept"
                name="department"
                defaultValue={member?.department ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="m-tz">Zona waktu</Label>
            <Input
              id="m-tz"
              name="timezone"
              placeholder="Asia/Jakarta"
              defaultValue={member?.timezone ?? 'Asia/Jakarta'}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="m-li">LinkedIn (URL)</Label>
              <Input
                id="m-li"
                name="linkedin"
                type="url"
                defaultValue={member?.linkedin ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-gh">GitHub (URL)</Label>
              <Input
                id="m-gh"
                name="github"
                type="url"
                defaultValue={member?.github ?? ''}
              />
            </div>
          </div>

          <CloudinaryImageField
            name="image"
            label="Foto profil"
            defaultUrl={member?.image}
            description="Unggah avatar (Cloudinary)."
          />

          <div className="grid gap-2">
            <Label htmlFor="m-bio">Bio</Label>
            <Textarea
              id="m-bio"
              name="bio"
              rows={3}
              defaultValue={member?.bio ?? ''}
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
                  ? 'Buat anggota'
                  : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
