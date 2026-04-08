'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, UserStatus } from '@prisma/client';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { assertCanChangeAdminMembership } from '@/lib/member-policy';
import { prisma } from '@/lib/prisma';
import {
  createUserWithCredential,
  normalizeUsername,
  updateCredentialPassword,
  validateMemberBasics,
} from '@/lib/user-credentials';

export type MemberActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<{ userId: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'admin') return null;
  return { userId: session.user.id };
}

export async function createMemberAction(formData: FormData): Promise<MemberActionResult> {
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: 'Hanya administrator yang dapat menambah anggota.' };

  const roleRaw = String(formData.get('role') ?? 'developer');
  const statusRaw = String(formData.get('status') ?? 'active');
  if (!(roleRaw in UserRole)) return { ok: false, error: 'Peran tidak valid.' };
  if (!(statusRaw in UserStatus)) return { ok: false, error: 'Status tidak valid.' };

  const r = await createUserWithCredential({
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    username: String(formData.get('username') ?? ''),
    password: String(formData.get('password') ?? ''),
    role: roleRaw as UserRole,
    status: statusRaw as UserStatus,
    phoneNumber: String(formData.get('phoneNumber') ?? '') || null,
    company: String(formData.get('company') ?? '') || null,
    department: String(formData.get('department') ?? '') || null,
    position: String(formData.get('position') ?? '') || null,
    bio: String(formData.get('bio') ?? '') || null,
    linkedin: String(formData.get('linkedin') ?? '') || null,
    github: String(formData.get('github') ?? '') || null,
    timezone: String(formData.get('timezone') ?? '') || null,
    image: String(formData.get('image') ?? '') || null,
  });

  if (!r.ok) return r;
  revalidatePath('/members');
  return { ok: true };
}

export async function updateMemberAction(formData: FormData): Promise<MemberActionResult> {
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: 'Hanya administrator yang dapat mengubah anggota.' };

  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, error: 'ID tidak valid.' };

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: 'Pengguna tidak ditemukan.' };

  const roleRaw = String(formData.get('role') ?? existing.role);
  const statusRaw = String(formData.get('status') ?? existing.status);
  if (!(roleRaw in UserRole)) return { ok: false, error: 'Peran tidak valid.' };
  if (!(statusRaw in UserStatus)) return { ok: false, error: 'Status tidak valid.' };

  const nextRole = roleRaw as UserRole;
  const nextStatus = statusRaw as UserStatus;

  const policy = await assertCanChangeAdminMembership({
    userId: id,
    currentRole: existing.role,
    currentStatus: existing.status,
    nextRole,
    nextStatus,
  });
  if (!policy.ok) return policy;

  const v = validateMemberBasics({
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    username: String(formData.get('username') ?? ''),
    requirePassword: false,
  });
  if (!v.ok) return v;

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const username = normalizeUsername(String(formData.get('username') ?? ''));
  const displayUsername =
    String(formData.get('displayUsername') ?? '').trim() || username;

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        username,
        displayUsername,
        role: nextRole,
        status: nextStatus,
        phoneNumber: String(formData.get('phoneNumber') ?? '').trim() || null,
        company: String(formData.get('company') ?? '').trim() || null,
        department: String(formData.get('department') ?? '').trim() || null,
        position: String(formData.get('position') ?? '').trim() || null,
        bio: String(formData.get('bio') ?? '').trim() || null,
        linkedin: String(formData.get('linkedin') ?? '').trim() || null,
        github: String(formData.get('github') ?? '').trim() || null,
        timezone:
          String(formData.get('timezone') ?? '').trim() || existing.timezone,
        image: String(formData.get('image') ?? '').trim() || null,
      },
    });

    if (
      nextStatus === UserStatus.inactive &&
      existing.status === UserStatus.active
    ) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    revalidatePath('/members');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique') || msg.includes('unique')) {
      return { ok: false, error: 'Email atau username sudah dipakai pengguna lain.' };
    }
    return { ok: false, error: 'Gagal memperbarui anggota.' };
  }
}

export async function resetMemberPasswordAction(
  formData: FormData,
): Promise<MemberActionResult> {
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: 'Tidak diizinkan.' };

  const userId = String(formData.get('userId') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!userId) return { ok: false, error: 'Pengguna tidak valid.' };

  const r = await updateCredentialPassword(userId, password);
  if (!r.ok) return r;

  await prisma.session.deleteMany({ where: { userId } });
  revalidatePath('/members');
  return { ok: true };
}
