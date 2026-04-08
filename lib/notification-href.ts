import { ACTIVITY_ENTITY } from '@/lib/activity-log-constants';

/** Tautan tujuan saat pengguna mengetuk notifikasi. */
export function notificationHref(n: {
  entityType: string;
  entityId: string;
  projectId: string | null;
}): string {
  const p = n.projectId;
  switch (n.entityType) {
    case ACTIVITY_ENTITY.task:
      return p ? `/projects/${p}/backlog` : '/dashboard';
    case ACTIVITY_ENTITY.discussion:
    case ACTIVITY_ENTITY.discussion_reply:
      return p ? `/projects/${p}/discussion` : '/dashboard';
    case ACTIVITY_ENTITY.sprint:
      return p ? `/projects/${p}/sprint` : '/dashboard';
    case ACTIVITY_ENTITY.maintenance:
      return p ? `/projects/${p}/maintenance` : '/dashboard';
    case ACTIVITY_ENTITY.meeting:
      return `/meetings/${n.entityId}`;
    case ACTIVITY_ENTITY.asset:
      return `/assets/${n.entityId}`;
    default:
      return p ? `/projects/${p}` : '/notifications';
  }
}
