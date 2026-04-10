-- Expand maintenance workflow (pipeline + parking lot) and optional task link.

CREATE TYPE "MaintenanceStatus_new" AS ENUM (
  'backlog',
  'in_progress',
  'awaiting_approval',
  'on_check',
  'need_revision',
  'completed',
  'canceled',
  'on_hold'
);

ALTER TABLE "maintenance" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "maintenance" ALTER COLUMN "status" TYPE "MaintenanceStatus_new" USING (
  CASE "status"::text
    WHEN 'open' THEN 'backlog'::"MaintenanceStatus_new"
    WHEN 'in_progress' THEN 'in_progress'::"MaintenanceStatus_new"
    WHEN 'resolved' THEN 'completed'::"MaintenanceStatus_new"
    WHEN 'closed' THEN 'canceled'::"MaintenanceStatus_new"
    WHEN 'rejected' THEN 'on_hold'::"MaintenanceStatus_new"
    ELSE 'backlog'::"MaintenanceStatus_new"
  END
);

ALTER TABLE "maintenance" ALTER COLUMN "status" SET DEFAULT 'backlog'::"MaintenanceStatus_new";

DROP TYPE "MaintenanceStatus";

ALTER TYPE "MaintenanceStatus_new" RENAME TO "MaintenanceStatus";

ALTER TABLE "tasks" ADD COLUMN "maintenanceId" TEXT;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_maintenanceId_fkey"
  FOREIGN KEY ("maintenanceId") REFERENCES "maintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tasks_maintenanceId_idx" ON "tasks"("maintenanceId");
