-- CreateEnum
CREATE TYPE "CallRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "callRequestId" INTEGER;

-- CreateTable
CREATE TABLE "CallRequest" (
    "id" SERIAL NOT NULL,
    "queryId" INTEGER NOT NULL,
    "adminId" INTEGER,
    "mode" "CallMode" NOT NULL,
    "message" TEXT,
    "status" "CallRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallRequest_queryId_idx" ON "CallRequest"("queryId");

-- CreateIndex
CREATE INDEX "CallRequest_adminId_idx" ON "CallRequest"("adminId");

-- CreateIndex
CREATE INDEX "Message_callRequestId_idx" ON "Message"("callRequestId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_callRequestId_fkey" FOREIGN KEY ("callRequestId") REFERENCES "CallRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRequest" ADD CONSTRAINT "CallRequest_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DonorQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRequest" ADD CONSTRAINT "CallRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
