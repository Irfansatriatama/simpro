'use server';

import { getAuthErrorMessage } from '@/lib/auth-errors';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type LoginFormState = { error: string | null };

export type SignInResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Login dengan username atau alamat email + password (Better Auth).
 */
export async function signInWithIdentifierAction(
  identifier: string,
  password: string,
): Promise<SignInResult> {
  const trimmed = identifier.trim();
  if (!trimmed || !password) {
    return { ok: false, error: 'Username/email dan password wajib diisi.' };
  }

  try {
    if (trimmed.includes('@')) {
      await auth.api.signInEmail({
        body: {
          email: trimmed.toLowerCase(),
          password,
        },
        headers: await headers(),
      });
    } else {
      await auth.api.signInUsername({
        body: { username: trimmed, password },
        headers: await headers(),
      });
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: getAuthErrorMessage(e),
    };
  }
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect('/login');
}

export async function loginFormAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const identifier = String(formData.get('identifier') ?? '');
  const password = String(formData.get('password') ?? '');
  const r = await signInWithIdentifierAction(identifier, password);
  if (r.ok) redirect('/dashboard');
  return { error: r.error };
}
