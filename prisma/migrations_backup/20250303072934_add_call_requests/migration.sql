/*
  Warnings:

  - You are about to drop the column `donorQueryId` on the `CallRequest` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `CallRequest` table. All the data in the column will be lost.
  - The `status` column on the `CallRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `mode` to the `CallRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `queryId` to the `CallRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CallRequest" DROP CONSTRAINT "CallRequest_donorQueryId_fkey";

-- AlterTable
ALTER TABLE "CallRequest" DROP COLUMN "donorQueryId",
DROP COLUMN "type",
ADD COLUMN     "mode" TEXT NOT NULL,
ADD COLUMN     "queryId" INTEGER NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "CallRequestStatus";

-- DropEnum
DROP TYPE "CallRequestType";

-- AddForeignKey
ALTER TABLE "CallRequest" ADD CONSTRAINT "CallRequest_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DonorQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
