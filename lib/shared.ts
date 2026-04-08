/** Konstanta & tipe bersama SIMPRO (boleh di-import dari server/client). */

export const APP_TAGLINE = 'Sistem Informasi Manajemen Project';

export type UserRole = 'admin' | 'pm' | 'developer' | 'viewer' | 'client';

export interface ApiSuccess<T> {
  data: T;
  message?: string;
  statusCode: number;
}
