/*
  Warnings:

  - You are about to drop the column `mode` on the `CallRequest` table. All the data in the column will be lost.
  - You are about to drop the column `mode` on the `CallSession` table. All the data in the column will be lost.
  - You are about to drop the column `callMode` on the `Message` table. All the data in the column will be lost.

*/
-- Add type columns
ALTER TABLE "CallRequest" ADD COLUMN "type" TEXT;
ALTER TABLE "CallSession" ADD COLUMN "type" TEXT;
ALTER TABLE "Message" ADD COLUMN "callType" TEXT;

-- Copy data from mode/callMode to type/callType
UPDATE "CallRequest" SET "type" = "mode"::TEXT;
UPDATE "CallSession" SET "type" = "mode"::TEXT;
UPDATE "Message" SET "callType" = "callMode"::TEXT;

-- Make the type column NOT NULL after data migration
ALTER TABLE "CallRequest" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "CallSession" ALTER COLUMN "type" SET NOT NULL;

-- Drop original columns
ALTER TABLE "CallRequest" DROP COLUMN "mode";
ALTER TABLE "CallSession" DROP COLUMN "mode";
ALTER TABLE "Message" DROP COLUMN "callMode";

-- DropEnum
DROP TYPE "CallMode";
