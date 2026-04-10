'use client';

import {
  Building2,
  Eye,
  LayoutGrid,
  List,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { CLIENT_INDUSTRY_OPTIONS } from '@/lib/client-industries';
import {
  type ClientRow,
  type ClientStatusValue,
  CLIENT_STATUSES,
} from '@/lib/client-types';

import { ClientFormDialog } from './client-form-dialog';
import { ClientStatusBadge } from './client-status-badge';

type StatusFilter = 'all' | ClientStatusValue;

function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function fmtSince(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function ClientsClient(props: { clients: ClientRow[] }) {
  const { clients } = props;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<ClientRow | null>(null);

  const filterActiveCount = useMemo(() => {
    let n = 0;
    if (statusFilter !== 'all') n++;
    if (industryFilter !== 'all') n++;
    return n;
  }, [statusFilter, industryFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      const blob = [
        c.companyName,
        c.industry,
        c.contactPerson,
        c.contactEmail,
        c.contactPhone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchStatus =
        statusFilter === 'all' || c.status === statusFilter;
      const matchInd =
        industryFilter === 'all' || c.industry === industryFilter;
      return matchQ && matchStatus && matchInd;
    });
  }, [clients, search, statusFilter, industryFilter]);

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Klien</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola akun klien dan proyek terhubung — pola daftar seperti Trackly.
          </p>
        </div>
        <Button
          type="button"
          className="gap-2"
          onClick={() => {
            setFormMode('create');
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Tambah klien
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari perusahaan, kontak, email…"
            className="pl-9"
            aria-label="Cari klien"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPanelSheet
            title="Filter klien"
            activeCount={filterActiveCount}
          >
            <FilterField label="Status">
              <SelectNative
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="w-full"
                aria-label="Filter status"
              >
                <option value="all">Semua status</option>
                {CLIENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'active'
                      ? 'Aktif'
                      : s === 'inactive'
                        ? 'Nonaktif'
                        : 'Prospek'}
                  </option>
                ))}
              </SelectNative>
            </FilterField>
            <FilterField label="Industri">
              <SelectNative
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="w-full"
              >
                <option value="all">Semua industri</option>
                {CLIENT_INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </SelectNative>
            </FilterField>
          </FilterPanelSheet>
          <div
            className="inline-flex rounded-lg border border-border bg-card p-0.5"
            role="group"
            aria-label="Tampilan"
          >
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              className="h-8 w-8 p-0"
              title="Kartu"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              className="h-8 w-8 p-0"
              title="Tabel"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Building2 className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">
            {clients.length === 0
              ? 'Belum ada klien'
              : 'Tidak ada klien yang cocok filter'}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {clients.length === 0
              ? 'Tambah klien pertama untuk memulai.'
              : 'Sesuaikan pencarian atau filter.'}
          </p>
          {clients.length === 0 ? (
            <Button
              type="button"
              className="mt-4 gap-2"
              onClick={() => {
                setFormMode('create');
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Tambah klien
            </Button>
          ) : null}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card"
            >
              <div className="flex items-start gap-3 border-b border-border bg-muted/20 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card text-sm font-bold text-primary">
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    companyInitials(c.companyName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/clients/${c.id}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {c.companyName}
                    </Link>
                    <ClientStatusBadge status={c.status} />
                  </div>
                  {c.industry ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.industry}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4 text-sm text-muted-foreground">
                {c.contactPerson ? (
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0" />
                    {c.contactPerson}
                  </p>
                ) : null}
                {c.contactEmail ? (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" />
                    <a
                      href={`mailto:${c.contactEmail}`}
                      className="truncate text-primary hover:underline"
                    >
                      {c.contactEmail}
                    </a>
                  </p>
                ) : null}
                {c.contactPhone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    {c.contactPhone}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {c.id.slice(0, 8)}…
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                    <Link href={`/clients/${c.id}`} title="Detail">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Edit"
                    onClick={() => {
                      setFormMode('edit');
                      setEditing(c);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Perusahaan</th>
                <th className="px-4 py-3 font-medium">Kontak</th>
                <th className="px-4 py-3 font-medium">Industri</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sejak</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-xs font-bold text-primary">
                        {c.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.logo}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          companyInitials(c.companyName)
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/clients/${c.id}`}
                          className="block truncate font-medium text-foreground hover:text-primary"
                        >
                          {c.companyName}
                        </Link>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {c.id.slice(0, 10)}…
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.contactPerson ? (
                      <span className="block text-foreground">
                        {c.contactPerson}
                      </span>
                    ) : null}
                    {c.contactEmail ? (
                      <span className="block text-xs">{c.contactEmail}</span>
                    ) : null}
                    {!c.contactPerson && !c.contactEmail ? '—' : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.industry ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ClientStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {fmtSince(c.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                        <Link href={`/clients/${c.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setFormMode('edit');
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        client={formMode === 'edit' ? editing : null}
      />
    </div>
  );
}
