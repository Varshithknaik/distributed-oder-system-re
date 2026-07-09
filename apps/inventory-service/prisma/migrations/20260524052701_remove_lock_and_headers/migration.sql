/*
  Warnings:

  - You are about to drop the column `headers` on the `outbox_events` table. All the data in the column will be lost.
  - You are about to drop the column `locked_at` on the `outbox_events` table. All the data in the column will be lost.
  - You are about to drop the column `locked_by` on the `outbox_events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "outbox_events" DROP COLUMN "headers",
DROP COLUMN "locked_at",
DROP COLUMN "locked_by";
