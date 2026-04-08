'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { resetMemberPasswordAction } from '@/app/actions/members';
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

export function MemberPasswordDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userLabel: string;
}) {
  const { open, onOpenChange, userId, userLabel } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormKey((k) => k + 1);
  }, [open, userId]);

  function onSubmit(formData: FormData) {
    setError(null);
    if (!userId) return;
    const a = String(formData.get('password') ?? '');
    const b = String(formData.get('password2') ?? '');
    if (a !== b) {
      setError('Konfirmasi password tidak sama.');
      return;
    }
    formData.set('userId', userId);
    formData.delete('password2');
    startTransition(async () => {
      const r = await resetMemberPasswordAction(formData);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set password baru untuk <strong>{userLabel}</strong>. Semua sesi login
            pengguna ini akan diakhiri.
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} action={onSubmit} className="grid gap-4">
          <input type="hidden" name="userId" value={userId ?? ''} />
          <div className="grid gap-2">
            <Label htmlFor="pw1">Password baru</Label>
            <Input
              id="pw1"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pw2">Ulangi password</Label>
            <Input
              id="pw2"
              name="password2"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
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
            <Button type="submit" disabled={pending || !userId}>
              {pending ? 'Menyimpan…' : 'Ubah password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
