import { needsBootstrap } from '@/lib/bootstrap';
import { redirect } from 'next/navigation';
import { SetupForm } from './setup-form';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  if (!(await needsBootstrap())) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-foreground">
          Konfigurasi awal SIMPRO
        </h1>
        <p className="mt-2 text-sm text-muted">
          Belum ada pengguna di database. Buat akun administrator pertama. Setelah
          ini halaman ini tidak akan tersedia lagi.
        </p>
        <SetupForm />
      </div>
    </main>
  );
}
