'use client';

import { MaintenanceStatus } from '@prisma/client';
import { FileSpreadsheet, Printer, Search, Settings2, Table } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
  SEVERITY_LABEL,
} from '@/lib/maintenance-labels';
import type { MaintenanceReportRow } from '@/lib/maintenance-types';
import { PRIORITY_LABEL } from '@/lib/project-labels';
import type { Priority, Severity } from '@prisma/client';
import { cn } from '@/lib/utils';

const ID_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatDateId(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Input date HTML (YYYY-MM-DD) atau ISO datetime. */
function formatDateRangeLabel(value: string): string {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return '—';
    return `${d} ${ID_MONTHS[m - 1]} ${y}`;
  }
  return formatDateId(value);
}

function defaultRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function slugFilePart(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 48) || 'project';
}

function picName(
  picClient: string | null,
  memberNameByUserId: Record<string, string>,
): string {
  if (!picClient) return '—';
  return memberNameByUserId[picClient] ?? picClient;
}

type ExportRow = Record<string, string | number>;

function buildExportRows(
  tickets: MaintenanceReportRow[],
  memberNameByUserId: Record<string, string>,
): ExportRow[] {
  return tickets.map((t, idx) => ({
    No: idx + 1,
    'No. Tiket': t.id,
    Proyek: t.projectName,
    Judul: t.title,
    'PIC pemohon': picName(t.picClient, memberNameByUserId),
    Status: MAINTENANCE_STATUS_LABEL[t.status],
    'Tanggal lapor': t.reportedDate ? formatDateId(t.reportedDate) : '',
    'Jatuh tempo': t.dueDate ? formatDateId(t.dueDate) : '',
    Prioritas: PRIORITY_LABEL[t.priority],
    Severity: t.severity ? SEVERITY_LABEL[t.severity as Severity] : '',
    Tipe: MAINTENANCE_TYPE_LABEL[t.type],
  }));
}

export function MaintenanceReportClient(props: {
  projectId: string;
  projectCode: string;
  projectName: string;
  orgDisplayName: string;
  subprojects: { id: string; name: string }[];
  memberNameByUserId: Record<string, string>;
  rows: MaintenanceReportRow[];
  showAggregateReportsLink: boolean;
}) {
  const {
    projectId,
    projectCode,
    projectName,
    orgDisplayName,
    subprojects,
    memberNameByUserId,
    rows: allRows,
    showAggregateReportsLink,
  } = props;

  const dr = defaultRange();
  const [dateFrom, setDateFrom] = useState(dr.from);
  const [dateTo, setDateTo] = useState(dr.to);
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus[]>([]);
  const [includeSubProjects, setIncludeSubProjects] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [filterOpen, setFilterOpen] = useState(false);
  const [draftIncludeSub, setDraftIncludeSub] = useState(false);
  const [draftFrom, setDraftFrom] = useState(dr.from);
  const [draftTo, setDraftTo] = useState(dr.to);
  const [draftStatuses, setDraftStatuses] = useState<Set<MaintenanceStatus>>(
    () => new Set(),
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const scopeProjectIds = useMemo(() => {
    if (includeSubProjects) {
      return [projectId, ...subprojects.map((s) => s.id)];
    }
    return [projectId];
  }, [includeSubProjects, projectId, subprojects]);

  const filteredTickets = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const q = debouncedSearch.trim().toLowerCase();

    return allRows.filter((t) => {
      if (!scopeProjectIds.includes(t.projectId)) return false;

      if (q) {
        const idM = t.id.toLowerCase().includes(q);
        const titleM = t.title.toLowerCase().includes(q);
        if (!idM && !titleM) return false;
      }

      if (t.reportedDate) {
        const d = new Date(t.reportedDate);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }

      if (
        statusFilter.length > 0 &&
        !statusFilter.includes(t.status)
      ) {
        return false;
      }

      return true;
    });
  }, [
    allRows,
    scopeProjectIds,
    dateFrom,
    dateTo,
    debouncedSearch,
    statusFilter,
  ]);

  const filterBadgeCount =
    statusFilter.length + (dateFrom || dateTo ? 1 : 0);

  const activeFilterDesc =
    statusFilter.length > 0
      ? `Status: ${statusFilter.map((s) => MAINTENANCE_STATUS_LABEL[s]).join(', ')}`
      : 'Semua status';

  const openFilterModal = useCallback(() => {
    setDraftIncludeSub(includeSubProjects);
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
    setDraftStatuses(new Set(statusFilter));
    setFilterOpen(true);
  }, [includeSubProjects, dateFrom, dateTo, statusFilter]);

  const applyFilter = () => {
    setIncludeSubProjects(draftIncludeSub);
    setDateFrom(draftFrom);
    setDateTo(draftTo);
    setStatusFilter(Array.from(draftStatuses));
    setFilterOpen(false);
  };

  const resetFilter = () => {
    const r = defaultRange();
    setDraftIncludeSub(false);
    setDraftFrom(r.from);
    setDraftTo(r.to);
    setDraftStatuses(new Set());
    setIncludeSubProjects(false);
    setDateFrom(r.from);
    setDateTo(r.to);
    setStatusFilter([]);
    setFilterOpen(false);
  };

  const exportRows = useMemo(
    () => buildExportRows(filteredTickets, memberNameByUserId),
    [filteredTickets, memberNameByUserId],
  );

  const handleCsv = () => {
    if (exportRows.length === 0) {
      alert('Tidak ada tiket untuk diekspor.');
      return;
    }
    const headers = Object.keys(exportRows[0]);
    const lines = [
      headers.map(escapeCsvField).join(','),
      ...exportRows.map((row) =>
        headers.map((h) => escapeCsvField(String(row[h] ?? ''))).join(','),
      ),
    ];
    const body = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = slugFilePart(projectName);
    a.download = `maintenance_report_${slug}_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExcel = async () => {
    if (exportRows.length === 0) {
      alert('Tidak ada tiket untuk diekspor.');
      return;
    }
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(exportRows);
      ws['!cols'] = [
        { wch: 4 },
        { wch: 28 },
        { wch: 22 },
        { wch: 36 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
        { wch: 10 },
        { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Report');
      const slug = slugFilePart(projectName);
      XLSX.writeFile(
        wb,
        `maintenance_report_${slug}_${dateFrom}_${dateTo}.xlsx`,
      );
    } catch (e) {
      console.error(e);
      alert('Gagal mengekspor Excel.');
    }
  };

  const handlePdf = () => {
    window.print();
  };

  const generatedLabel = formatDateId(new Date().toISOString());

  return (
    <div className="maintenance-report-print-root space-y-6">
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
            <span className="font-mono">{projectCode}</span> — {projectName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCsv}>
            <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExcel}
          >
            <Table className="mr-2 h-4 w-4" aria-hidden />
            Export Excel
          </Button>
          <Button type="button" size="sm" onClick={handlePdf}>
            <Printer className="mr-2 h-4 w-4" aria-hidden />
            Cetak / PDF
          </Button>
          {showAggregateReportsLink ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}/reports`}>
                Laporan proyek (agregat)
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID tiket atau judul…"
            className="pl-9"
            aria-label="Cari laporan"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={openFilterModal}
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          Filter
          {filterBadgeCount > 0 ? ` · ${filterBadgeCount}` : ''}
        </Button>
      </div>

      <p className="hidden text-center text-sm text-muted-foreground print:block">
        {orgDisplayName} — {projectCode} — {projectName}
      </p>

      <div className="hidden print:block print:py-2">
        <div className="border-b border-foreground/20 pb-3">
          <p className="text-lg font-semibold">{orgDisplayName}</p>
          <p className="mt-2 text-sm">
            <strong>Laporan maintenance</strong>
            <br />
            Proyek: {projectName}
            <br />
            Tanggal lapor: {formatDateRangeLabel(dateFrom)} –{' '}
            {formatDateRangeLabel(dateTo)}
            <br />
            Filter: {activeFilterDesc}
            <br />
            Dibuat: {generatedLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm print:hidden">
        <div>
          <span className="font-medium text-foreground">{projectName}</span>
          <span className="text-muted-foreground">
            {' '}
            — {activeFilterDesc} · Tanggal lapor:{' '}
            {formatDateRangeLabel(dateFrom)} – {formatDateRangeLabel(dateTo)}
            {includeSubProjects ? ' · termasuk sub-proyek' : ''}
          </span>
        </div>
        <span className="text-muted-foreground">
          {filteredTickets.length} tiket
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card print:shadow-none print:border-foreground/30">
        {filteredTickets.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            Tidak ada tiket pada rentang filter. Ubah tanggal atau status.
          </p>
        ) : (
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-surface/80 text-xs uppercase text-muted-foreground print:bg-transparent">
              <tr>
                <th className="w-10 px-2 py-2 text-center font-medium">No</th>
                <th className="px-3 py-2 font-medium">No. Tiket</th>
                <th className="px-3 py-2 font-medium">Judul</th>
                <th className="px-3 py-2 font-medium">Proyek</th>
                <th className="px-3 py-2 font-medium">PIC pemohon</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Tanggal lapor</th>
                <th className="px-3 py-2 font-medium">Jatuh tempo</th>
                <th className="px-3 py-2 font-medium">Prioritas</th>
                <th className="px-3 py-2 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTickets.map((t, idx) => (
                <tr
                  key={t.id}
                  className={cn(idx % 2 === 1 && 'bg-surface/40 print:bg-transparent')}
                >
                  <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {t.id}
                  </td>
                  <td className="max-w-[220px] px-3 py-2 font-medium text-foreground">
                    {t.title}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.projectName}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {picName(t.picClient, memberNameByUserId)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {MAINTENANCE_STATUS_LABEL[t.status]}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {t.reportedDate ? formatDateId(t.reportedDate) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {t.dueDate ? formatDateId(t.dueDate) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 capitalize text-muted-foreground">
                    {PRIORITY_LABEL[t.priority as Priority]}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {t.severity
                      ? SEVERITY_LABEL[t.severity as Severity]
                      : '—'}
                  </td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-sm text-muted-foreground print:hidden">
        Hanya Admin dan PM yang dapat mengakses halaman ini. Ekspor memakai
        baris yang terlihat sesuai filter. PDF memakai dialog cetak browser.
      </p>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter laporan</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {subprojects.length > 0 ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface/50 p-3">
                <input
                  type="checkbox"
                  checked={draftIncludeSub}
                  onChange={(e) => setDraftIncludeSub(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border"
                />
                <span className="text-sm font-medium">
                  Sertakan data sub-proyek
                </span>
              </label>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">
                Tanggal lapor
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="min-w-[140px] flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Dari
                  </label>
                  <Input
                    type="date"
                    value={draftFrom}
                    onChange={(e) => setDraftFrom(e.target.value)}
                  />
                </div>
                <div className="min-w-[140px] flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Sampai
                  </label>
                  <Input
                    type="date"
                    value={draftTo}
                    onChange={(e) => setDraftTo(e.target.value)}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Tiket tanpa tanggal lapor tetap tampil (seperti Trackly untuk
                assigned date kosong).
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Status</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      setDraftStatuses(
                        new Set(Object.values(MaintenanceStatus)),
                      )
                    }
                  >
                    Pilih semua
                  </button>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setDraftStatuses(new Set())}
                  >
                    Hapus semua
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {Object.values(MaintenanceStatus).map((s) => (
                  <label
                    key={s}
                    className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={draftStatuses.has(s)}
                      onChange={(e) => {
                        setDraftStatuses((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(s);
                          else next.delete(s);
                          return next;
                        });
                      }}
                      className="h-4 w-4 rounded border-border"
                    />
                    {MAINTENANCE_STATUS_LABEL[s]}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={resetFilter}>
              Reset filter
            </Button>
            <Button type="button" onClick={applyFilter}>
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
