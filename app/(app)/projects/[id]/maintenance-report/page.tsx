import Link from 'next/link';

import { MaintenanceReportPrintButton } from '@/components/maintenance/maintenance-report-print-button';
import { Button } from '@/components/ui/button';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
  SEVERITY_LABEL,
} from '@/lib/maintenance-labels';
import {
  canManageProjects,
  projectViewWhere,
} from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { Severity } from '@prisma/client';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function fmtDate(iso: Date | null): string {
  if (!iso) return '—';
  try {
    return iso.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default async function MaintenanceReportPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const projectId = params.id;

  const project = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, projectId),
    select: { id: true, code: true, name: true },
  });
  if (!project) notFound();

  const rows = await prisma.maintenance.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      priority: true,
      severity: true,
      reportedDate: true,
      resolvedDate: true,
      estimatedHours: true,
      actualHours: true,
      costEstimate: true,
    },
  });

  const showReportsLink = canManageProjects(role);
  const printedAt = new Date().toLocaleString('id-ID');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" asChild>
            <Link href={`/projects/${projectId}/maintenance`}>
              ← Kembali ke maintenance
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            Laporan maintenance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{project.code}</span> — {project.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MaintenanceReportPrintButton />
          {showReportsLink ? (
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/reports`}>
                Laporan proyek (agregat)
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <p className="hidden text-xs text-muted-foreground print:block">
        SIMPRO — {project.code} — {project.name} — dicetak {printedAt}
      </p>

      <p className="text-sm text-muted-foreground print:hidden">
        Ringkasan tabel tiket maintenance proyek ini. Untuk grafik dan metrik
        gabungan, gunakan{' '}
        {showReportsLink ? (
          <Link
            href={`/projects/${projectId}/reports`}
            className="text-primary underline"
          >
            Laporan
          </Link>
        ) : (
          'Laporan (admin/PM)'
        )}
        .
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card print:shadow-none">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Judul</th>
              <th className="px-3 py-2 font-medium">Tipe</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Prioritas</th>
              <th className="px-3 py-2 font-medium">Severity</th>
              <th className="px-3 py-2 font-medium">Lapor</th>
              <th className="px-3 py-2 font-medium">Selesai</th>
              <th className="px-3 py-2 text-right font-medium">Jam est.</th>
              <th className="px-3 py-2 text-right font-medium">Jam aktual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Belum ada tiket maintenance.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface/40">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {r.title}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {MAINTENANCE_TYPE_LABEL[r.type]}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {MAINTENANCE_STATUS_LABEL[r.status]}
                  </td>
                  <td className="px-3 py-2 capitalize text-muted-foreground">
                    {r.priority}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.severity
                      ? SEVERITY_LABEL[r.severity as Severity]
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {fmtDate(r.reportedDate)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {fmtDate(r.resolvedDate)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {r.estimatedHours != null ? r.estimatedHours : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {r.actualHours != null ? r.actualHours : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
