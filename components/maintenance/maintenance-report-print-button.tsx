'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function MaintenanceReportPrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      Cetak
    </Button>
  );
}
