/*
  Warnings:

  - Changed the type of `mode` on the `CallRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CallMode" AS ENUM ('VIDEO', 'AUDIO', 'SCREEN');

-- AlterTable
ALTER TABLE "CallRequest" DROP COLUMN "mode",
ADD COLUMN     "mode" "CallMode" NOT NULL;
