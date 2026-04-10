-- Align legacy meeting status with Trackly-style `done`
UPDATE "meetings" SET "status" = 'done' WHERE "status" = 'completed';
