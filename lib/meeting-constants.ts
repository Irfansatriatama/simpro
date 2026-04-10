/** Aligned with Trackly (`_reference/js/modules/meetings.js`) enum values. */

export const MEETING_TYPES = [
  'internal',
  'client_meeting',
  'sprint_review',
  'retrospective',
  'other',
] as const;

export type MeetingTypeValue = (typeof MEETING_TYPES)[number];

/** Legacy values from older SIMPRO builds → canonical Trackly-style type. */
export const LEGACY_MEETING_TYPE_TO_CANONICAL: Record<string, MeetingTypeValue> = {
  standup: 'internal',
  planning: 'sprint_review',
  review: 'sprint_review',
  kickoff: 'other',
  client: 'client_meeting',
  internal: 'internal',
  other: 'other',
};

export const MEETING_TYPE_LABEL: Record<MeetingTypeValue, string> = {
  internal: 'Internal',
  client_meeting: 'Meeting klien',
  sprint_review: 'Sprint review',
  retrospective: 'Retrospective',
  other: 'Lainnya',
};

export function meetingTypeLabel(raw: string): string {
  if ((MEETING_TYPES as readonly string[]).includes(raw)) {
    return MEETING_TYPE_LABEL[raw as MeetingTypeValue];
  }
  if (raw in LEGACY_MEETING_TYPE_TO_CANONICAL) {
    return MEETING_TYPE_LABEL[LEGACY_MEETING_TYPE_TO_CANONICAL[raw]!];
  }
  return raw;
}

export const MEETING_TYPE_COLOR: Record<MeetingTypeValue, string> = {
  internal: '#2563EB',
  client_meeting: '#7C3AED',
  sprint_review: '#16A34A',
  retrospective: '#D97706',
  other: '#64748B',
};

export const MEETING_STATUSES = [
  'scheduled',
  'ongoing',
  'done',
  'cancelled',
] as const;

export type MeetingStatusValue = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABEL: Record<MeetingStatusValue, string> = {
  scheduled: 'Terjadwal',
  ongoing: 'Berlangsung',
  done: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const MEETING_STATUS_BADGE: Record<
  MeetingStatusValue,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  scheduled: 'secondary',
  ongoing: 'default',
  done: 'outline',
  cancelled: 'destructive',
};

/** Legacy `completed` → `done` */
export function normalizeMeetingStatus(raw: string): MeetingStatusValue {
  if (raw === 'completed') return 'done';
  if ((MEETING_STATUSES as readonly string[]).includes(raw)) {
    return raw as MeetingStatusValue;
  }
  return 'scheduled';
}

export function isMeetingType(s: string): boolean {
  return (
    (MEETING_TYPES as readonly string[]).includes(s) ||
    s in LEGACY_MEETING_TYPE_TO_CANONICAL
  );
}

export function isMeetingStatus(s: string): boolean {
  return (
    (MEETING_STATUSES as readonly string[]).includes(s) || s === 'completed'
  );
}

export function canonicalMeetingType(raw: string): MeetingTypeValue {
  if ((MEETING_TYPES as readonly string[]).includes(raw)) {
    return raw as MeetingTypeValue;
  }
  return LEGACY_MEETING_TYPE_TO_CANONICAL[raw] ?? 'other';
}

export function meetingStatusLabel(raw: string): string {
  return MEETING_STATUS_LABEL[normalizeMeetingStatus(raw)];
}
