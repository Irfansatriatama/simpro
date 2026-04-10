import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DatabaseUnavailablePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface p-6">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 shadow-card">
        <h1 className="text-xl font-semibold text-foreground">
          Database tidak terjangkau
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Aplikasi tidak bisa menyambung ke server PostgreSQL (biasanya Supabase).
          Ini masalah koneksi atau konfigurasi, bukan bug di halaman tertentu.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Di{' '}
            <strong className="text-foreground">Supabase Dashboard</strong>, pastikan
            proyek <strong className="text-foreground">Active</strong> (bukan paused
            — paket gratis bisa sleep).
          </li>
          <li>
            Periksa <code className="rounded bg-surface px-1">.env</code>:{' '}
            <code className="rounded bg-surface px-1">DATABASE_URL</code> dan{' '}
            <code className="rounded bg-surface px-1">DIRECT_URL</code> harus
            sesuai <strong>Connection string</strong> terbaru (Settings → Database).
          </li>
          <li>
            Port <strong className="text-foreground">6543</strong> = pooler;{' '}
            <strong className="text-foreground">5432</strong> = koneksi langsung.
            Salin string dari dashboard, jangan tebak.
          </li>
          <li>
            Setelah mengubah <code className="rounded bg-surface px-1">.env</code>,
            hentikan lalu jalankan lagi{' '}
            <code className="rounded bg-surface px-1">npm run dev</code>.
          </li>
          <li>
            Di Windows: tutup proses yang memakai DB client, lalu jalankan{' '}
            <code className="rounded bg-surface px-1">npx prisma generate</code>{' '}
            jika perlu.
          </li>
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">
          Setelah database hidup dan URL benar, muat ulang halaman atau buka{' '}
          <Link href="/" className="text-primary underline-offset-4 hover:underline">
            beranda
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
