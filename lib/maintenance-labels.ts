import {
  MaintenanceStatus,
  MaintenanceType,
  Severity,
} from '@prisma/client';

export const MAINTENANCE_TYPE_LABEL: Record<MaintenanceType, string> = {
  [MaintenanceType.bug]: 'Bug',
  [MaintenanceType.adjustment]: 'Penyesuaian',
  [MaintenanceType.enhancement]: 'Peningkatan',
  [MaintenanceType.user_request]: 'Permintaan pengguna',
  [MaintenanceType.incident]: 'Insiden',
};

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.backlog]: 'Backlog',
  [MaintenanceStatus.in_progress]: 'Dikerjakan',
  [MaintenanceStatus.awaiting_approval]: 'Menunggu persetujuan',
  [MaintenanceStatus.on_check]: 'Pengecekan',
  [MaintenanceStatus.need_revision]: 'Perlu revisi',
  [MaintenanceStatus.completed]: 'Selesai',
  [MaintenanceStatus.canceled]: 'Dibatalkan',
  [MaintenanceStatus.on_hold]: 'Ditahan',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  [Severity.major]: 'Mayor',
  [Severity.minor]: 'Minor',
};

export function isMaintenanceType(s: string): s is MaintenanceType {
  return Object.values(MaintenanceType).includes(s as MaintenanceType);
}

export function isMaintenanceStatus(s: string): s is MaintenanceStatus {
  return Object.values(MaintenanceStatus).includes(s as MaintenanceStatus);
}

export function isSeverity(s: string): s is Severity {
  return Object.values(Severity).includes(s as Severity);
}
