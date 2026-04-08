export const MEETING_TYPES = [
  'standup',
  'planning',
  'review',
  'kickoff',
  'client',
  'internal',
  'other',
] as const;

export type MeetingTypeValue = (typeof MEETING_TYPES)[number];

export const MEETING_TYPE_LABEL: Record<MeetingTypeValue, string> = {
  standup: 'Stand-up',
  planning: 'Perencanaan',
  review: 'Review',
  kickoff: 'Kick-off',
  client: 'Klien',
  internal: 'Internal',
  other: 'Lainnya',
};

export const MEETING_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
export type MeetingStatusValue = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABEL: Record<MeetingStatusValue, string> = {
  scheduled: 'Terjadwal',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export function isMeetingType(s: string): s is MeetingTypeValue {
  return (MEETING_TYPES as readonly string[]).includes(s);
}

export function isMeetingStatus(s: string): s is MeetingStatusValue {
  return (MEETING_STATUSES as readonly string[]).includes(s);
}
