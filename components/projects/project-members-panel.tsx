'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  addProjectMemberAction,
  removeProjectMemberAction,
  updateProjectMemberRoleAction,
} from '@/app/actions/projects';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import type {
  ProjectMemberRow,
  UserPickRow,
} from '@/lib/project-types';

const ROLES = ['pm', 'developer', 'designer', 'qa', 'viewer', 'client'];

export function ProjectMembersPanel(props: {
  projectId: string;
  members: ProjectMemberRow[];
  eligibleUsers: UserPickRow[];
  canManage: boolean;
}) {
  const { projectId, members, eligibleUsers, canManage } = props;
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManage && members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Belum ada anggota.</p>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Anggota</h2>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              setAddOpen(true);
            }}
            disabled={eligibleUsers.length === 0}
          >
            Tambah
          </Button>
        ) : null}
      </div>

      <ul className="mt-3 divide-y divide-border">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                @{m.username} · {m.email}
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-wrap items-center gap-2">
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      fd.set('projectId', projectId);
                      fd.set('userId', m.userId);
                      const r = await updateProjectMemberRoleAction(fd);
                      if (!r.ok) setError(r.error);
                      else router.refresh();
                    });
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <SelectNative
                    name="projectRole"
                    defaultValue={m.projectRole}
                    className="w-36"
                    aria-label={`Peran ${m.name}`}
                  >
                    {Array.from(new Set([...ROLES, m.projectRole]))
                      .sort()
                      .map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </SelectNative>
                  <Button type="submit" size="sm" variant="secondary" disabled={pending}>
                    Peran
                  </Button>
                </form>
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      fd.set('projectId', projectId);
                      fd.set('userId', m.userId);
                      const r = await removeProjectMemberAction(fd);
                      if (!r.ok) setError(r.error);
                      else router.refresh();
                    });
                  }}
                >
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:text-danger"
                    disabled={pending || members.length <= 1}
                  >
                    Hapus
                  </Button>
                </form>
              </div>
            ) : (
              <span className="rounded bg-border/60 px-2 py-0.5 text-xs capitalize">
                {m.projectRole}
              </span>
            )}
          </li>
        ))}
      </ul>

      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah anggota</DialogTitle>
            <DialogDescription>
              Pilih pengguna aktif yang belum tergabung di proyek ini.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(fd) => {
              setError(null);
              startTransition(async () => {
                fd.set('projectId', projectId);
                const r = await addProjectMemberAction(fd);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                setAddOpen(false);
                router.refresh();
              });
            }}
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="add-user">Pengguna</Label>
              <SelectNative id="add-user" name="userId" required>
                <option value="">— Pilih —</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.username})
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-role">Peran di proyek</Label>
              <SelectNative
                id="add-role"
                name="projectRole"
                required
                defaultValue="developer"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </SelectNative>
            </div>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={pending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Menambah…' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
