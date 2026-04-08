'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  loginFormAction,
  type LoginFormState,
} from '@/app/actions/auth';

const initial: LoginFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
    >
      {pending ? 'Memproses…' : 'Masuk'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginFormAction, initial);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="identifier"
          className="block text-sm font-medium text-foreground"
        >
          Username atau email
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
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
