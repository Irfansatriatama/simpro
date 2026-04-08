'use server';

import { auth } from '@/lib/auth';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { createBootstrapAdmin } from '@/lib/bootstrap-user';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type SetupFormState = { error: string | null };

export async function bootstrapAdminFormAction(
  _prev: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  const name = String(formData.get('name') ?? '');
  const email = String(formData.get('email') ?? '');
  const username = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  if (password !== confirm) {
    return { error: 'Konfirmasi password tidak sama.' };
  }

  const created = await createBootstrapAdmin({ name, email, username, password });
  if (!created.ok) {
    return { error: created.error };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: email.trim().toLowerCase(),
        password,
      },
      headers: await headers(),
    });
  } catch (e) {
    return {
      error: `Akun admin sudah dibuat, tetapi login otomatis gagal: ${getAuthErrorMessage(e)}. Silakan masuk di halaman login.`,
    };
  }

  redirect('/dashboard');
}
