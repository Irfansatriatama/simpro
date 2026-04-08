export const SPRINT_STATUSES = [
  'planning',
  'active',
  'completed',
  'cancelled',
] as const;

export type SprintStatusValue = (typeof SPRINT_STATUSES)[number];

export const SPRINT_STATUS_LABEL: Record<SprintStatusValue, string> = {
  planning: 'Perencanaan',
  active: 'Berjalan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export function isSprintStatus(s: string): s is SprintStatusValue {
  return (SPRINT_STATUSES as readonly string[]).includes(s);
}

export function sprintStatusLabel(status: string): string {
  if (isSprintStatus(status)) return SPRINT_STATUS_LABEL[status];
  return status;
}
