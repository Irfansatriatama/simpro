'use client';

import { UserRole, UserStatus } from '@prisma/client';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import type { MemberRow } from '@/lib/members-types';

import { MemberFormDialog } from './member-form-dialog';
import { MemberPasswordDialog } from './member-password-dialog';
import { RoleBadge } from './role-badge';
import { StatusBadge } from './status-badge';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function MembersClient(props: {
  members: MemberRow[];
  currentUserId: string;
}) {
  const { members, currentUserId } = props;
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<MemberRow | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [pwLabel, setPwLabel] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || m.role === roleFilter;
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchQ && matchRole && matchStatus;
    });
  }, [members, search, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Anggota</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola pengguna, peran, dan status akun. Hanya administrator.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setFormMode('create');
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah anggota
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, username…"
            className="pl-9"
            aria-label="Cari anggota"
          />
        </div>
        <SelectNative
          value={roleFilter}
          onChange={(e) =>
            setRoleFilter(e.target.value as 'all' | UserRole)
          }
          className="w-full sm:w-44"
          aria-label="Filter peran"
        >
          <option value="all">Semua peran</option>
          <option value={UserRole.admin}>Administrator</option>
          <option value={UserRole.pm}>Project Manager</option>
          <option value={UserRole.developer}>Developer</option>
          <option value={UserRole.viewer}>Viewer</option>
          <option value={UserRole.client}>Klien</option>
        </SelectNative>
        <SelectNative
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'all' | UserStatus)
          }
          className="w-full sm:w-40"
          aria-label="Filter status"
        >
          <option value="all">Semua status</option>
          <option value={UserStatus.active}>Aktif</option>
          <option value={UserStatus.inactive}>Nonaktif</option>
          <option value={UserStatus.invited}>Diundang</option>
        </SelectNative>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Pengguna</th>
              <th className="px-4 py-3 font-medium">Peran</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Terdaftar</th>
              <th className="px-4 py-3 font-medium">Login terakhir</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Tidak ada anggota yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-border/80">
                        {m.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL bebas dari profil pengguna
                          <img
                            src={m.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
                            {m.name
                              .split(/\s+/)
                              .map((p) => p[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {m.name}
                          {m.id === currentUserId ? (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              (Anda)
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{m.username} · {m.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={m.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.lastLogin ? formatDate(m.lastLogin) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormMode('edit');
                          setEditing(m);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setPwUserId(m.id);
                          setPwLabel(m.name);
                          setPwOpen(true);
                        }}
                      >
                        Password
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        member={formMode === 'edit' ? editing : null}
      />

      <MemberPasswordDialog
        open={pwOpen}
        onOpenChange={setPwOpen}
        userId={pwUserId}
        userLabel={pwLabel}
      />
    </div>
  );
}
