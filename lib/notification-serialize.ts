import type { Notification } from '@prisma/client';

import type { NotificationDTO } from '@/lib/notification-types';

export function toNotificationDTO(row: Notification): NotificationDTO {
  return {
    id: row.id,
    read: row.read,
    message: row.message,
    entityType: row.entityType,
    entityId: row.entityId,
    entityName: row.entityName,
    action: row.action,
    actorName: row.actorName,
    actorAvatar: row.actorAvatar,
    projectId: row.projectId,
    projectName: row.projectName,
    createdAt: row.createdAt.toISOString(),
  };
}
