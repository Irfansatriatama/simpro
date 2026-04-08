import { UserRole, UserStatus, type Prisma } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import { prisma } from '@/lib/prisma';

export const USERNAME_RE = /^[a-zA-Z0-9_.]+$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export type UserBasicsValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateMemberBasics(input: {
  name: string;
  email: string;
  username: string;
  password?: string;
  requirePassword?: boolean;
}): UserBasicsValidation {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const username = normalizeUsername(input.username);
  const requirePassword = input.requirePassword ?? false;

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
  const pw = input.password ?? '';
  if (requirePassword && pw.length < 8) {
    return { ok: false, error: 'Password minimal 8 karakter.' };
  }
  if (input.password !== undefined && input.password.length > 0 && pw.length < 8) {
    return { ok: false, error: 'Password minimal 8 karakter.' };
  }
  return { ok: true };
}

export type CreateCredentialMemberInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
  phoneNumber?: string | null;
  company?: string | null;
  department?: string | null;
  position?: string | null;
  bio?: string | null;
  linkedin?: string | null;
  github?: string | null;
  timezone?: string | null;
  image?: string | null;
};

export type CredentialMutationResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function createUserWithCredential(
  input: CreateCredentialMemberInput,
): Promise<CredentialMutationResult> {
  const v = validateMemberBasics({
    name: input.name,
    email: input.email,
    username: input.username,
    password: input.password,
    requirePassword: true,
  });
  if (!v.ok) return v;

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const username = normalizeUsername(input.username);
  const displayUsername = input.username.trim();
  const passwordHash = await hashPassword(input.password);
  const status = input.status ?? UserStatus.active;

  const data: Prisma.UserCreateInput = {
    name,
    email,
    emailVerified: true,
    username,
    displayUsername: displayUsername || username,
    role: input.role,
    status,
    phoneNumber: input.phoneNumber?.trim() || null,
    company: input.company?.trim() || null,
    department: input.department?.trim() || null,
    position: input.position?.trim() || null,
    bio: input.bio?.trim() || null,
    linkedin: input.linkedin?.trim() || null,
    github: input.github?.trim() || null,
    timezone: input.timezone?.trim() || 'Asia/Jakarta',
    image: input.image?.trim() || null,
  };

  try {
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data });
      await tx.account.create({
        data: {
          accountId: u.id,
          providerId: 'credential',
          userId: u.id,
          password: passwordHash,
        },
      });
      return u;
    });
    return { ok: true, userId: user.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique') || msg.includes('unique')) {
      return { ok: false, error: 'Email atau username sudah terdaftar.' };
    }
    return { ok: false, error: 'Gagal membuat anggota.' };
  }
}

export async function updateCredentialPassword(
  userId: string,
  plainPassword: string,
): Promise<CredentialMutationResult> {
  if (plainPassword.length < 8) {
    return { ok: false, error: 'Password minimal 8 karakter.' };
  }
  const passwordHash = await hashPassword(plainPassword);
  const account = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
  });
  if (!account) {
    return { ok: false, error: 'Akun credential tidak ditemukan.' };
  }
  await prisma.account.update({
    where: { id: account.id },
    data: { password: passwordHash },
  });
  return { ok: true, userId };
}
