'use server';

import { prisma } from '@/lib/prisma';

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function checkDatabaseAction(): Promise<ActionResult<{ ping: true }>> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, data: { ping: true } };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Database unreachable';
    return { ok: false, error: message };
  }
}
