-- DropForeignKey
ALTER TABLE "note_audits" DROP CONSTRAINT "note_audits_noteId_fkey";

-- AlterTable
ALTER TABLE "note_audits" ALTER COLUMN "noteId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "note_audits_noteId_idx" ON "note_audits"("noteId");

-- AddForeignKey
ALTER TABLE "note_audits" ADD CONSTRAINT "note_audits_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
