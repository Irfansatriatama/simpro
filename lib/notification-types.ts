/** Baris notifikasi untuk klien (tanggal ISO). */
export type NotificationDTO = {
  id: string;
  read: boolean;
  message: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  actorName: string;
  actorAvatar: string | null;
  projectId: string | null;
  projectName: string | null;
  createdAt: string;
};
