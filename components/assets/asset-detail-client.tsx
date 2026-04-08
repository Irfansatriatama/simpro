'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deleteAssetAction } from '@/app/actions/assets';
import { Button } from '@/components/ui/button';
import { ASSET_CATEGORY_LABEL } from '@/lib/asset-constants';
import type { AssetProjectPick, AssetRow, AssetUserPick } from '@/lib/asset-types';

import { AssetFormDialog } from './asset-form-dialog';
import { AssetStatusBadge } from './asset-status-badge';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function fmtMoney(n: number | null): string {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

export function AssetDetailClient(props: {
  asset: AssetRow;
  projects: AssetProjectPick[];
  users: AssetUserPick[];
}) {
  const { asset, projects, users } = props;
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const catLabel =
    ASSET_CATEGORY_LABEL[
      asset.category as keyof typeof ASSET_CATEGORY_LABEL
    ] ?? asset.category;

  function removeAsset() {
    if (!window.confirm(`Hapus aset "${asset.name}"?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', asset.id);
      const r = await deleteAssetAction(fd);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      router.push('/assets');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/assets"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Semua aset
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
          {asset.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL dari data aset
            <img
              src={asset.image}
              alt=""
              className="h-24 w-24 shrink-0 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface/50 text-xs text-muted-foreground">
              Tanpa gambar
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {catLabel}
              {asset.serialNumber ? (
                <>
                  {' '}
                  · SN {asset.serialNumber}
                </>
              ) : null}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              {asset.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AssetStatusBadge status={asset.status} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            disabled={pending}
            onClick={removeAsset}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-4 shadow-card lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Ringkasan</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Tanggal beli</dt>
              <dd className="text-foreground">{fmtDate(asset.purchaseDate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Harga beli</dt>
              <dd className="text-foreground">{fmtMoney(asset.purchasePrice)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vendor</dt>
              <dd className="text-foreground">{asset.vendor ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Garansi hingga</dt>
              <dd className="text-foreground">
                {fmtDate(asset.warrantyExpiry)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Proyek</dt>
              <dd className="text-foreground">
                {asset.projectId && asset.projectCode ? (
                  <Link
                    href={`/projects/${asset.projectId}`}
                    className="text-primary hover:underline"
                  >
                    {asset.projectCode}
                    {asset.projectName ? ` — ${asset.projectName}` : ''}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Penanggung jawab</dt>
              <dd className="text-foreground">
                {asset.assigneeName ?? '—'}
              </dd>
            </div>
          </dl>
          {asset.description ? (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-xs font-medium uppercase text-muted-foreground">
                Deskripsi
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {asset.description}
              </p>
            </div>
          ) : null}
          {asset.notes ? (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-xs font-medium uppercase text-muted-foreground">
                Catatan
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {asset.notes}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
          <p>
            Dibuat:{' '}
            <span className="text-foreground">
              {fmtDate(asset.createdAt)}
            </span>
          </p>
          <p className="mt-2">
            Diperbarui:{' '}
            <span className="text-foreground">
              {fmtDate(asset.updatedAt)}
            </span>
          </p>
        </section>
      </div>

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="edit"
        asset={asset}
        projects={projects}
        users={users}
      />
    </div>
  );
}
