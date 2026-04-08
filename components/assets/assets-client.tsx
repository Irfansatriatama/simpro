'use client';

import { PackagePlus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  FilterField,
  FilterPanelSheet,
} from '@/components/filters/filter-panel-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABEL,
  ASSET_STATUSES,
  ASSET_STATUS_LABEL,
} from '@/lib/asset-constants';
import type { AssetProjectPick, AssetRow, AssetUserPick } from '@/lib/asset-types';

import { AssetFormDialog } from './asset-form-dialog';
import { AssetStatusBadge } from './asset-status-badge';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
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

export function AssetsClient(props: {
  rows: AssetRow[];
  projects: AssetProjectPick[];
  users: AssetUserPick[];
}) {
  const { rows, projects, users } = props;
  const [search, setSearch] = useState('');
  const [catF, setCatF] = useState<string>('all');
  const [statusF, setStatusF] = useState<string>('all');
  const [projectF, setProjectF] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<AssetRow | null>(null);

  const filterActiveCount = useMemo(() => {
    let n = 0;
    if (catF !== 'all') n++;
    if (statusF !== 'all') n++;
    if (projectF !== 'all') n++;
    return n;
  }, [catF, statusF, projectF]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const blob = [
        r.name,
        r.serialNumber,
        r.vendor,
        r.projectCode,
        r.projectName,
        r.assigneeName,
        r.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchQ = !q || blob.includes(q);
      const matchC = catF === 'all' || r.category === catF;
      const matchS = statusF === 'all' || r.status === statusF;
      const matchP =
        projectF === 'all' ||
        (projectF === 'none' && !r.projectId) ||
        r.projectId === projectF;
      return matchQ && matchC && matchS && matchP;
    });
  }, [rows, search, catF, statusF, projectF]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Aset</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventaris perusahaan dan proyek. Hanya administrator dan PM.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setFormMode('create');
            setEditing(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <PackagePlus className="h-4 w-4" />
          Tambah aset
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, SN, vendor, proyek…"
            className="pl-9"
            aria-label="Cari aset"
          />
        </div>
        <FilterPanelSheet
          title="Filter aset"
          activeCount={filterActiveCount}
        >
          <FilterField label="Kategori">
            <SelectNative
              value={catF}
              onChange={(e) => setCatF(e.target.value)}
              className="w-full"
              aria-label="Filter kategori"
            >
              <option value="all">Semua kategori</option>
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {ASSET_CATEGORY_LABEL[c]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Status">
            <SelectNative
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
              className="w-full"
              aria-label="Filter status"
            >
              <option value="all">Semua status</option>
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ASSET_STATUS_LABEL[s]}
                </option>
              ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Proyek">
            <SelectNative
              value={projectF}
              onChange={(e) => setProjectF(e.target.value)}
              className="w-full"
              aria-label="Filter proyek"
            >
              <option value="all">Semua proyek</option>
              <option value="none">Tanpa proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        </FilterPanelSheet>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">SN</th>
              <th className="px-4 py-3 font-medium">Proyek</th>
              <th className="px-4 py-3 font-medium">PJ</th>
              <th className="px-4 py-3 font-medium">Garansi</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Tidak ada aset yang cocok.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/assets/${r.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ASSET_CATEGORY_LABEL[
                      r.category as keyof typeof ASSET_CATEGORY_LABEL
                    ] ?? r.category}
                  </td>
                  <td className="px-4 py-3">
                    <AssetStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {r.serialNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.projectCode ? (
                      <Link
                        href={`/projects/${r.projectId}`}
                        className="text-primary hover:underline"
                      >
                        {r.projectCode}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.assigneeName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmtDate(r.warrantyExpiry)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/assets/${r.id}`}>Detail</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFormMode('edit');
                          setEditing(r);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        asset={formMode === 'edit' ? editing : null}
        projects={projects}
        users={users}
      />
    </div>
  );
}
