'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import type { ClientRow } from '@/lib/client-types';

import { ClientFormDialog } from './client-form-dialog';
import { ClientStatusBadge } from './client-status-badge';

type StatusFilter = 'all' | 'active' | 'inactive';

export function ClientsClient(props: { clients: ClientRow[] }) {
  const { clients } = props;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<ClientRow | null>(null);

  const filterActiveCount = statusFilter === 'all' ? 0 : 1;

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
      return matchQ && matchStatus;
    });
  }, [clients, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Klien</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Perusahaan klien dan kontak. Diakses administrator dan PM.
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
          Tambah klien
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, industri, kontak…"
            className="pl-9"
            aria-label="Cari klien"
          />
        </div>
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
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </SelectNative>
          </FilterField>
        </FilterPanelSheet>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
            Tidak ada klien yang cocok.
          </p>
        ) : (
          filtered.map((c) => (
            <article
              key={c.id}
              className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-card"
            >
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
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.industry}
                </p>
              ) : null}
              <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
                {c.contactPerson ? (
                  <div>
                    <dt className="sr-only">Kontak</dt>
                    <dd>{c.contactPerson}</dd>
                  </div>
                ) : null}
                {c.contactEmail ? (
                  <div>
                    <dt className="sr-only">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${c.contactEmail}`}
                        className="text-primary hover:underline"
                      >
                        {c.contactEmail}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {c.contactPhone ? (
                  <div>
                    <dt className="sr-only">Telepon</dt>
                    <dd>{c.contactPhone}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                {c.projectCount} proyek terhubung
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/clients/${c.id}`}>Detail</Link>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFormMode('edit');
                    setEditing(c);
                    setFormOpen(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        client={formMode === 'edit' ? editing : null}
      />
    </div>
  );
}
