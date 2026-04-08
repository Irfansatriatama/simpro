/**
 * SIMPRO full-stack di satu origin Next.js.
 * Panggilan ke Better Auth: `/api/auth/*` (route handler resmi).
 * Data bisnis: gunakan server actions di `app/actions/*`.
 */
export const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
