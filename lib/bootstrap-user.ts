import { UserRole, UserStatus } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import { prisma } from '@/lib/prisma';

const USERNAME_RE = /^[a-zA-Z0-9_.]+$/;

export type BootstrapInput = {
  name: string;
  email: string;
  username: string;
  password: string;
};

export type BootstrapResult =
  | { ok: true }
  | { ok: false; error: string };

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Buat user admin pertama (password di-hash sama seperti Better Auth).
 * Hanya panggil jika `prisma.user.count() === 0`.
 */
export async function createBootstrapAdmin(
  input: BootstrapInput,
): Promise<BootstrapResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const username = normalizeUsername(input.username);
  const password = input.password;

  if (!name || name.length < 2) {
    return { ok: false, error: 'Nama minimal 2 karakter.' };
  }
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Email tidak valid.' };
  }
  if (username.length < 3 || username.length > 30) {
    return { ok: false, error: 'Username 3–30 karakter.' };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: 'Username hanya huruf, angka, titik, dan underscore.',
    };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password minimal 8 karakter.' };
  }

  const count = await prisma.user.count();
  if (count > 0) {
    return { ok: false, error: 'Sistem sudah punya pengguna.' };
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        username,
        displayUsername: input.username.trim(),
        role: UserRole.admin,
        status: UserStatus.active,
      },
    });

    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: passwordHash,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique') || msg.includes('unique')) {
      return { ok: false, error: 'Email atau username sudah terdaftar.' };
    }
    return { ok: false, error: 'Gagal membuat akun admin.' };
  }

  return { ok: true };
}
