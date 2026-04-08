export const DISCUSSION_TYPES = [
  'general',
  'announcement',
  'question',
  'decision',
] as const;

export type DiscussionTypeValue = (typeof DISCUSSION_TYPES)[number];

export const DISCUSSION_TYPE_LABEL: Record<DiscussionTypeValue, string> = {
  general: 'Umum',
  announcement: 'Pengumuman',
  question: 'Pertanyaan',
  decision: 'Keputusan',
};

export function isDiscussionType(s: string): s is DiscussionTypeValue {
  return (DISCUSSION_TYPES as readonly string[]).includes(s);
}

export function discussionTypeLabel(type: string): string {
  if (isDiscussionType(type)) return DISCUSSION_TYPE_LABEL[type];
  return type;
}
