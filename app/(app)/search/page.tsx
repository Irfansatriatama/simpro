import Link from 'next/link';

import { auth } from '@/lib/auth';
import { globalSearch } from '@/lib/global-search';
import { getUserRole } from '@/lib/session-user';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const q = searchParams.q ?? '';
  const data = await globalSearch(session.user.id, getUserRole(session), q);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pencarian</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proyek dan tugas sesuai akses Anda (minimal 2 karakter).
        </p>
      </div>

      <form action="/search" method="get" className="flex gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={data.query}
          placeholder="Kode/nama proyek atau judul tugas…"
          className="flex h-10 flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          autoComplete="off"
          aria-label="Kueri pencarian"
        />
        <button
          type="submit"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white shadow hover:bg-primary-dark"
        >
          Cari
        </button>
      </form>

      {data.query.length === 1 ? (
        <p className="text-sm text-destructive">Minimal 2 karakter.</p>
      ) : null}

      {data.query.length >= 2 ? (
        <>
          {data.capped ? (
            <p className="text-xs text-muted-foreground">
              Menampilkan hingga 30 hasil per kategori. Persempit kata kunci
              bila perlu.
            </p>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Proyek ({data.projects.length})
            </h2>
            {data.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada proyek yang cocok.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card shadow-card">
                {data.projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="block px-4 py-3 text-sm transition-colors hover:bg-surface/60"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.code}
                      </span>{' '}
                      <span className="font-medium text-foreground">
                        {p.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Tugas ({data.tasks.length})
            </h2>
            {data.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada tugas yang cocok.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card shadow-card">
                {data.tasks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/projects/${t.projectId}/backlog`}
                      className="block px-4 py-3 text-sm transition-colors hover:bg-surface/60"
                    >
                      <p className="font-medium text-foreground">{t.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.projectCode} — {t.projectName}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Masukkan kata kunci di atas lalu tekan <strong>Cari</strong>, atau
          gunakan bilah pencarian di desktop.
        </p>
      )}
    </div>
  );
}
