-- AlterTable
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "boardColumns" JSONB;
