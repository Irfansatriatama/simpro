import type {
  MaintenanceStatus,
  MaintenanceType,
  Priority,
  Severity,
} from '@prisma/client';

export type MaintenancePicRow = { userId: string; name: string };

export type MaintenanceRow = {
  id: string;
  title: string;
  description: string | null;
  type: MaintenanceType;
  priority: Priority;
  status: MaintenanceStatus;
  severity: Severity | null;
  reportedBy: string | null;
  reportedDate: string | null;
  resolvedDate: string | null;
  dueDate: string | null;
  orderedBy: string | null;
  picClient: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  costEstimate: number | null;
  notes: string | null;
  resolutionNotes: string | null;
  updatedAt: string;
  picDevs: MaintenancePicRow[];
};
