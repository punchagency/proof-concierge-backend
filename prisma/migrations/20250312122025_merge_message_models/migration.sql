/*
  Warnings:

  - You are about to drop the column `adminId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_donorQueryId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_adminId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_queryId_fkey";

-- DropIndex
DROP INDEX "Message_adminId_idx";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "adminId",
ADD COLUMN     "fcmToken" TEXT,
ADD COLUMN     "messageType" TEXT NOT NULL DEFAULT 'QUERY',
ADD COLUMN     "recipientId" INTEGER,
ADD COLUMN     "senderId" INTEGER,
ALTER COLUMN "queryId" DROP NOT NULL;

-- DropTable
DROP TABLE "ChatMessage";

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DonorQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
