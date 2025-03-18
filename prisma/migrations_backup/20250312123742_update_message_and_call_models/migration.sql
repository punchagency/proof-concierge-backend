/*
  Warnings:

  - The `messageType` column on the `Message` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `CallRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VideoSession` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `status` on the `CallSession` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('QUERY', 'CHAT', 'SYSTEM', 'CALL_STARTED', 'CALL_ENDED');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('CREATED', 'STARTED', 'ENDED');

-- DropForeignKey
ALTER TABLE "CallRequest" DROP CONSTRAINT "CallRequest_adminId_fkey";

-- DropForeignKey
ALTER TABLE "CallRequest" DROP CONSTRAINT "CallRequest_queryId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_queryId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "VideoSession" DROP CONSTRAINT "VideoSession_queryId_fkey";

-- AlterTable
ALTER TABLE "CallSession" DROP COLUMN "status",
ADD COLUMN     "status" "CallStatus" NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "callMode" "CallMode",
ADD COLUMN     "roomName" TEXT,
DROP COLUMN "messageType",
ADD COLUMN     "messageType" "MessageType" NOT NULL DEFAULT 'QUERY';

-- DropTable
DROP TABLE "CallRequest";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "VideoSession";
