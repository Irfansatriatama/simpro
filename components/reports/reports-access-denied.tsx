import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function ReportsAccessDenied(props: { projectId: string }) {
  const { projectId } = props;
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <p className="text-lg font-semibold text-foreground">Akses ditolak</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Hanya administrator dan PM yang dapat membuka laporan proyek ini, sesuai
        kebijakan modul laporan di referensi produk.
      </p>
      <Button asChild variant="outline">
        <Link href={`/projects/${projectId}`}>Kembali ke ringkasan proyek</Link>
      </Button>
    </div>
  );
}
