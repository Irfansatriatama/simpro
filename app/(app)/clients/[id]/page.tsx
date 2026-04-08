import { ClientDetailActions } from '@/components/clients/client-detail-actions';
import { ClientStatusBadge } from '@/components/clients/client-status-badge';
import { Button } from '@/components/ui/button';
import type { ClientRow } from '@/lib/client-types';
import { requireManagementSession } from '@/lib/management-auth';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@prisma/client';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  [ProjectStatus.planning]: 'Perencanaan',
  [ProjectStatus.active]: 'Aktif',
  [ProjectStatus.maintenance]: 'Maintenance',
  [ProjectStatus.on_hold]: 'Ditahan',
  [ProjectStatus.completed]: 'Selesai',
  [ProjectStatus.cancelled]: 'Dibatalkan',
};

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!(await requireManagementSession())) {
    redirect('/dashboard');
  }

  const { id } = params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          phase: true,
          progress: true,
        },
      },
    },
  });

  if (!client) notFound();

  const clientRow: ClientRow = {
    id: client.id,
    companyName: client.companyName,
    industry: client.industry,
    contactPerson: client.contactPerson,
    contactEmail: client.contactEmail,
    contactPhone: client.contactPhone,
    address: client.address,
    website: client.website,
    logo: client.logo,
    notes: client.notes,
    status: client.status,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    projectCount: client.projects.length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
            <Link href="/clients">← Kembali ke daftar klien</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            {client.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL dari data klien
              <img
                src={client.logo}
                alt=""
                className="h-14 w-14 rounded-lg border border-border object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">
                {client.companyName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ClientStatusBadge status={client.status} />
                {client.industry ? (
                  <span className="text-sm text-muted-foreground">
                    {client.industry}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <ClientDetailActions client={clientRow} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Kontak</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {client.contactPerson ? (
                <div>
                  <dt className="text-muted-foreground">Nama</dt>
                  <dd className="text-foreground">{client.contactPerson}</dd>
                </div>
              ) : null}
              {client.contactEmail ? (
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${client.contactEmail}`}
                      className="text-primary hover:underline"
                    >
                      {client.contactEmail}
                    </a>
                  </dd>
                </div>
              ) : null}
              {client.contactPhone ? (
                <div>
                  <dt className="text-muted-foreground">Telepon</dt>
                  <dd className="text-foreground">{client.contactPhone}</dd>
                </div>
              ) : null}
              {client.website ? (
                <div>
                  <dt className="text-muted-foreground">Website</dt>
                  <dd>
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {client.website}
                    </a>
                  </dd>
                </div>
              ) : null}
              {!client.contactPerson &&
              !client.contactEmail &&
              !client.contactPhone &&
              !client.website ? (
                <p className="text-muted-foreground">Belum diisi.</p>
              ) : null}
            </dl>
          </section>

          {client.address ? (
            <section className="rounded-lg border border-border bg-card p-4 shadow-card">
              <h2 className="text-sm font-semibold text-foreground">Alamat</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {client.address}
              </p>
            </section>
          ) : null}

          {client.notes ? (
            <section className="rounded-lg border border-border bg-card p-4 shadow-card">
              <h2 className="text-sm font-semibold text-foreground">Catatan</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {client.notes}
              </p>
            </section>
          ) : null}
        </div>

        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Proyek terhubung ({client.projects.length})
          </h2>
          {client.projects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card py-10 text-center text-sm text-muted-foreground">
              Belum ada proyek yang menaut ke klien ini.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kode</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Progres</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {client.projects.map((p) => (
                    <tr key={p.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/projects/${p.id}`}
                          className="text-primary hover:underline"
                        >
                          {p.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {STATUS_LABEL[p.status]}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {p.progress}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
