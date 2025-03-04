-- Add assignedToId field to DonorQuery table
ALTER TABLE "DonorQuery" ADD COLUMN "assignedToId" INTEGER;

-- Add foreign key constraint
ALTER TABLE "DonorQuery" ADD CONSTRAINT "DonorQuery_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX "DonorQuery_assignedToId_idx" ON "DonorQuery"("assignedToId"); 