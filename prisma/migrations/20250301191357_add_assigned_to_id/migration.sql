-- AlterTable
ALTER TABLE "DonorQuery" ADD COLUMN     "assignedToId" INTEGER;

-- AddForeignKey
ALTER TABLE "DonorQuery" ADD CONSTRAINT "DonorQuery_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
