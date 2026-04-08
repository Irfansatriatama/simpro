import { Priority, ProjectPhase, ProjectStatus } from '@prisma/client';

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  [ProjectStatus.planning]: 'Perencanaan',
  [ProjectStatus.active]: 'Aktif',
  [ProjectStatus.maintenance]: 'Maintenance',
  [ProjectStatus.on_hold]: 'Ditahan',
  [ProjectStatus.completed]: 'Selesai',
  [ProjectStatus.cancelled]: 'Dibatalkan',
};

export const PROJECT_PHASE_LABEL: Record<ProjectPhase, string> = {
  [ProjectPhase.development]: 'Development',
  [ProjectPhase.uat]: 'UAT',
  [ProjectPhase.deployment]: 'Deployment',
  [ProjectPhase.running]: 'Running',
  [ProjectPhase.maintenance]: 'Maintenance',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  [Priority.low]: 'Rendah',
  [Priority.medium]: 'Sedang',
  [Priority.high]: 'Tinggi',
  [Priority.critical]: 'Kritis',
};
