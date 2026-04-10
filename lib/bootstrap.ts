import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type BootstrapState =
  | { ok: true; needsSetup: boolean }
  | { ok: false; reason: 'database' };

function isDatabaseUnreachableError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return e.code === 'P1001';
  }
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("Can't reach database") ||
    msg.includes('P1001') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT')
  );
}

/**
 * Cek apakah perlu setup admin pertama. Jika DB tidak terjangkau, kembalikan
 * `{ ok: false }` agar UI bisa mengarahkan ke halaman bantuan (bukan crash).
 */
export async function getBootstrapState(): Promise<BootstrapState> {
  try {
    const count = await prisma.user.count();
    return { ok: true, needsSetup: count === 0 };
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return { ok: false, reason: 'database' };
    }
    throw e;
  }
}

/** @deprecated Gunakan getBootstrapState agar bisa menangani DB down. */
export async function needsBootstrap(): Promise<boolean> {
  const s = await getBootstrapState();
  if (!s.ok) return false;
  return s.needsSetup;
}
