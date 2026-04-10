import { MaintenanceStatus } from '@prisma/client';

import type { MaintenanceRow } from '@/lib/maintenance-types';
import type { AppRole } from '@/lib/nav-config';

/** Kolom alur utama (run-in pipeline). */
export const MAIN_PIPELINE_MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.backlog,
  MaintenanceStatus.in_progress,
  MaintenanceStatus.awaiting_approval,
  MaintenanceStatus.on_check,
  MaintenanceStatus.need_revision,
  MaintenanceStatus.completed,
];

/** Parkir: tiket tidak aktif di pipeline utama. */
export const PARKING_LOT_MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.canceled,
  MaintenanceStatus.on_hold,
];

export const ALL_BOARD_MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  ...MAIN_PIPELINE_MAINTENANCE_STATUSES,
  ...PARKING_LOT_MAINTENANCE_STATUSES,
];

export function isMaintenanceParkingStatus(status: MaintenanceStatus): boolean {
  return PARKING_LOT_MAINTENANCE_STATUSES.includes(status);
}

/** Developer hanya PIC (atau tiket tanpa PIC); peran lain bebas. */
export function userCanInteractMaintenanceTicketAsPic(
  row: MaintenanceRow,
  userRole: AppRole,
  currentUserId: string,
): boolean {
  if (userRole !== 'developer') return true;
  return (
    row.picDevs.length === 0 ||
    row.picDevs.some((p) => p.userId === currentUserId)
  );
}
