/*
  Warnings:

  - You are about to drop the column `type` on the `CallRequest` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `CallSession` table. All the data in the column will be lost.
  - You are about to drop the column `callType` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CallRequest" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "CallSession" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "callType";
