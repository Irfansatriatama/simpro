import { MaintenanceStatus } from '@prisma/client';

/** Status yang menandakan tiket selesai (tanggal selesai diisi). */
export function maintenanceCompletedLike(status: MaintenanceStatus): boolean {
  return status === MaintenanceStatus.completed;
}
