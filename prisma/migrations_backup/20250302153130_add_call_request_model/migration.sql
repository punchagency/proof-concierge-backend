-- CreateTable
CREATE TABLE "CallRequest" (
    "id" SERIAL NOT NULL,
    "queryId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CallRequest" ADD CONSTRAINT "CallRequest_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DonorQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRequest" ADD CONSTRAINT "CallRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
