/*
  Warnings:

  - The values [SCREEN_SHARE] on the enum `QueryMode` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `mode` on the `CallRequest` table. All the data in the column will be lost.
  - You are about to drop the column `queryId` on the `CallRequest` table. All the data in the column will be lost.
  - The `status` column on the `CallRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `donorQueryId` to the `CallRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `CallRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CallRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CallRequestType" AS ENUM ('VIDEO', 'AUDIO', 'SCREEN');

-- AlterEnum
BEGIN;
CREATE TYPE "QueryMode_new" AS ENUM ('TEXT', 'HUDDLE', 'VIDEO_CALL');
ALTER TABLE "DonorQuery" ALTER COLUMN "queryMode" DROP DEFAULT;
ALTER TABLE "DonorQuery" ALTER COLUMN "queryMode" TYPE "QueryMode_new" USING ("queryMode"::text::"QueryMode_new");
ALTER TYPE "QueryMode" RENAME TO "QueryMode_old";
ALTER TYPE "QueryMode_new" RENAME TO "QueryMode";
DROP TYPE "QueryMode_old";
ALTER TABLE "DonorQuery" ALTER COLUMN "queryMode" SET DEFAULT 'TEXT';
COMMIT;

-- DropForeignKey
ALTER TABLE "CallRequest" DROP CONSTRAINT "CallRequest_queryId_fkey";

-- AlterTable
ALTER TABLE "CallRequest" DROP COLUMN "mode",
DROP COLUMN "queryId",
ADD COLUMN     "donorQueryId" INTEGER NOT NULL,
ADD COLUMN     "type" "CallRequestType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "CallRequestStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "CallRequest" ADD CONSTRAINT "CallRequest_donorQueryId_fkey" FOREIGN KEY ("donorQueryId") REFERENCES "DonorQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
