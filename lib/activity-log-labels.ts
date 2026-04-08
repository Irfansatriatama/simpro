import { ACTIVITY_ACTION, ACTIVITY_ENTITY } from '@/lib/activity-log-constants';

const ENTITY_LABEL: Record<string, string> = {
  [ACTIVITY_ENTITY.task]: 'Tugas',
  [ACTIVITY_ENTITY.sprint]: 'Sprint',
  [ACTIVITY_ENTITY.maintenance]: 'Maintenance',
  [ACTIVITY_ENTITY.discussion]: 'Diskusi',
  [ACTIVITY_ENTITY.discussion_reply]: 'Balasan diskusi',
  [ACTIVITY_ENTITY.meeting]: 'Meeting',
  [ACTIVITY_ENTITY.asset]: 'Aset',
};

const ACTION_LABEL: Record<string, string> = {
  [ACTIVITY_ACTION.created]: 'Dibuat',
  [ACTIVITY_ACTION.updated]: 'Diperbarui',
  [ACTIVITY_ACTION.deleted]: 'Dihapus',
  [ACTIVITY_ACTION.board_moved]: 'Dipindah di board',
  [ACTIVITY_ACTION.pin_toggled]: 'Sematan diubah',
};

export function activityEntityLabel(entityType: string): string {
  return ENTITY_LABEL[entityType] ?? entityType;
}

export function activityActionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}
