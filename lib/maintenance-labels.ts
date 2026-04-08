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
  [MaintenanceStatus.open]: 'Terbuka',
  [MaintenanceStatus.in_progress]: 'Dikerjakan',
  [MaintenanceStatus.resolved]: 'Terselesaikan',
  [MaintenanceStatus.closed]: 'Ditutup',
  [MaintenanceStatus.rejected]: 'Ditolak',
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
