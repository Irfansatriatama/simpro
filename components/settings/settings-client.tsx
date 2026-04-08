'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { updateOrgSettingsAction } from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import {
  SETTINGS_CURRENCIES,
  SETTINGS_DATE_FORMATS,
  SETTINGS_TIMEZONES,
  type OrgSettings,
} from '@/lib/settings-constants';
import { cn } from '@/lib/utils';

type Tab = 'general' | 'about';

export function SettingsClient(props: {
  initial: OrgSettings;
  appVersion: string;
  envAppName: string;
}) {
  const { initial, appVersion, envAppName } = props;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('general');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    setError(null);
    setFormKey((k) => k + 1);
  }, [initial]);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await updateOrgSettingsAction(formData);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferensi organisasi. Hanya administrator dan PM.
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2 border-b border-border pb-2"
        role="tablist"
        aria-label="Bagian pengaturan"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'general'}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'general'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-surface/80',
          )}
          onClick={() => setTab('general')}
        >
          Umum
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'about'}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'about'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-surface/80',
          )}
          onClick={() => setTab('about')}
        >
          Tentang
        </button>
      </div>

      {tab === 'general' ? (
        <section
          className="rounded-lg border border-border bg-card p-6 shadow-card"
          role="tabpanel"
        >
          <h2 className="text-lg font-semibold text-foreground">
            Pengaturan umum
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nama sistem dipakai di judul aplikasi (sidebar &amp; bilah atas).
            Sebelum ada baris di basis data, nama mengikuti{' '}
            <code className="rounded bg-border/50 px-1 text-xs">
              NEXT_PUBLIC_APP_NAME
            </code>{' '}
            ({envAppName}) lalu fallback SIMPRO.
          </p>

          <form
            key={formKey}
            action={onSubmit}
            className="mt-6 grid gap-5 sm:grid-cols-2"
          >
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="system_name">Nama sistem</Label>
              <Input
                id="system_name"
                name="system_name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={initial.systemName}
                placeholder="SIMPRO"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Zona waktu</Label>
              <SelectNative
                id="timezone"
                name="timezone"
                defaultValue={initial.timezone}
              >
                {SETTINGS_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date_format">Format tanggal</Label>
              <SelectNative
                id="date_format"
                name="date_format"
                defaultValue={initial.dateFormat}
              >
                {SETTINGS_DATE_FORMATS.map((df) => (
                  <option key={df} value={df}>
                    {df}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="currency">Mata uang</Label>
              <SelectNative
                id="currency"
                name="currency"
                defaultValue={initial.currency}
              >
                {SETTINGS_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hourly_rate">Tarif per jam default</Label>
              <Input
                id="hourly_rate"
                name="hourly_rate"
                type="text"
                inputMode="decimal"
                defaultValue={
                  initial.hourlyRate === 0 ? '' : String(initial.hourlyRate)
                }
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tax_rate">Pajak default (%)</Label>
              <Input
                id="tax_rate"
                name="tax_rate"
                type="text"
                inputMode="decimal"
                defaultValue={String(initial.taxRate)}
                placeholder="11"
              />
            </div>

            {error ? (
              <p
                className="sm:col-span-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Menyimpan…' : 'Simpan pengaturan'}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === 'about' ? (
        <section
          className="rounded-lg border border-border bg-card p-6 shadow-card"
          role="tabpanel"
        >
          <h2 className="text-lg font-semibold text-foreground">Tentang SIMPRO</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Versi paket</dt>
              <dd className="font-mono text-foreground">{appVersion}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Stack</dt>
              <dd className="text-foreground">
                Next.js (App Router), Prisma, PostgreSQL, Better Auth, server
                actions — tanpa backend Nest terpisah.
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Referensi produk</dt>
              <dd className="text-foreground">
                Paritas fitur mengikuti dokumentasi Trackly di folder{' '}
                <code className="rounded bg-border/50 px-1 text-xs">
                  _reference/
                </code>
                .
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
