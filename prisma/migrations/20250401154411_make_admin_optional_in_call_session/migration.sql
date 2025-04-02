-- DropForeignKey
ALTER TABLE "CallSession" DROP CONSTRAINT "CallSession_adminId_fkey";

-- AlterTable
ALTER TABLE "CallSession" ALTER COLUMN "adminId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
