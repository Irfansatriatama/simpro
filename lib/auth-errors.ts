/** Pesan error yang aman untuk ditampilkan ke pengguna (Better Auth / better-call). */
export function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const o = error as {
      body?: { message?: string };
      message?: string;
    };
    if (typeof o.body?.message === 'string' && o.body.message) {
      return o.body.message;
    }
    if (typeof o.message === 'string' && o.message) {
      return o.message;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Terjadi kesalahan. Coba lagi.';
}
