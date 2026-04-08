'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { ClientRow } from '@/lib/client-types';

import { ClientFormDialog } from './client-form-dialog';

export function ClientDetailActions({ client }: { client: ClientRow }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Edit klien
      </Button>
      <ClientFormDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        client={client}
      />
    </>
  );
}
