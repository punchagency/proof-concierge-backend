-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('ADMIN', 'DONOR', 'SYSTEM');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "donorId" TEXT,
ADD COLUMN     "donorInfo" JSONB,
ADD COLUMN     "donorName" TEXT,
ADD COLUMN     "senderType" "SenderType" NOT NULL DEFAULT 'ADMIN';

-- Populate senderType for existing messages
UPDATE "Message" SET "senderType" = 'ADMIN' WHERE "isFromAdmin" = true;
UPDATE "Message" SET "senderType" = 'DONOR' WHERE "isFromAdmin" = false;

-- For system messages, set senderType to SYSTEM
UPDATE "Message" SET "senderType" = 'SYSTEM' WHERE "messageType" = 'SYSTEM';

-- Try to populate donorId and donorName for donor messages from their queries
UPDATE "Message" m
SET 
  "donorId" = q."donorId",
  "donorName" = q."donor"
FROM "DonorQuery" q
WHERE 
  m."queryId" = q."id" 
  AND m."senderType" = 'DONOR';

-- CreateIndex
CREATE INDEX "Message_donorId_idx" ON "Message"("donorId");
