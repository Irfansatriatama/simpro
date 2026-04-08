export type ActivityLogRow = {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  actorId: string | null;
  actorName: string;
  changes: unknown;
  metadata: unknown;
  createdAt: string;
};
