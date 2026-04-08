'use client';

import { Filter } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type FilterPanelSheetProps = {
  title?: string;
  /** Jumlah filter yang tidak berada pada nilai default / “semua”. */
  activeCount: number;
  children: React.ReactNode;
  triggerClassName?: string;
};

export function FilterPanelSheet({
  title = 'Filter',
  activeCount,
  children,
  triggerClassName,
}: FilterPanelSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('shrink-0 gap-2', triggerClassName)}
        >
          <Filter className="h-4 w-4" aria-hidden />
          <span>Filter</span>
          {activeCount > 0 ? (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full max-w-sm flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {children}
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <Button
            type="button"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Selesai
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
