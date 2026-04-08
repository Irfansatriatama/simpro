'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  bootstrapAdminFormAction,
  type SetupFormState,
} from '@/app/actions/bootstrap';

const initial: SetupFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
    >
      {pending ? 'Membuat akun…' : 'Buat admin & masuk'}
    </button>
  );
}

export function SetupForm() {
  const [state, formAction] = useFormState(bootstrapAdminFormAction, initial);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          Nama lengkap
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-foreground">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_.]+"
          title="Huruf, angka, titik, underscore"
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted">
          Untuk login (boleh huruf, angka, . dan _)
        </p>
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-foreground"
        >
          Konfirmasi password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
