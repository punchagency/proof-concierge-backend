/*
  Warnings:

  - You are about to drop the `CallRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CallSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DonorQuery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CallRequest" DROP CONSTRAINT "CallRequest_adminId_fkey";

-- DropForeignKey
ALTER TABLE "CallRequest" DROP CONSTRAINT "CallRequest_queryId_fkey";

-- DropForeignKey
ALTER TABLE "CallSession" DROP CONSTRAINT "CallSession_adminId_fkey";

-- DropForeignKey
ALTER TABLE "CallSession" DROP CONSTRAINT "CallSession_queryId_fkey";

-- DropForeignKey
ALTER TABLE "DonorQuery" DROP CONSTRAINT "DonorQuery_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "DonorQuery" DROP CONSTRAINT "DonorQuery_resolvedById_fkey";

-- DropForeignKey
ALTER TABLE "DonorQuery" DROP CONSTRAINT "DonorQuery_transferredToUserId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_callRequestId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_callSessionId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_queryId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropTable
DROP TABLE "CallRequest";

-- DropTable
DROP TABLE "CallSession";

-- DropTable
DROP TABLE "DonorQuery";

-- DropTable
DROP TABLE "Message";

-- DropEnum
DROP TYPE "CallRequestStatus";

-- DropEnum
DROP TYPE "CallStatus";

-- DropEnum
DROP TYPE "MessageType";

-- DropEnum
DROP TYPE "QueryStatus";

-- DropEnum
DROP TYPE "SenderType";
