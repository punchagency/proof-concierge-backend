-- Create QueryStatus enum
DROP TYPE IF EXISTS "QueryStatus";
CREATE TYPE "QueryStatus" AS ENUM ('IN_PROGRESS', 'RESOLVED', 'TRANSFERRED');

-- Create QueryMode enum
DROP TYPE IF EXISTS "QueryMode";
CREATE TYPE "QueryMode" AS ENUM ('TEXT', 'HUDDLE', 'VIDEO_CALL');

-- Create DonorQuery table if it doesn't exist
CREATE TABLE IF NOT EXISTS "DonorQuery" (
    "id" SERIAL PRIMARY KEY,
    "sid" TEXT NOT NULL,
    "donor" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "test" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "queryMode" "QueryMode",
    "device" TEXT NOT NULL,
    "status" "QueryStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferredTo" TEXT,
    "transferredToUserId" INTEGER,
    "resolvedById" INTEGER,
    "transferNote" TEXT,
    "assignedToId" INTEGER
);

-- Add unique constraint for sid (wrapped in DO block to handle if it already exists)
DO $$
BEGIN
    BEGIN
        ALTER TABLE "DonorQuery" ADD CONSTRAINT "DonorQuery_sid_key" UNIQUE ("sid");
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists, do nothing
    END;
END $$;

-- Create indexes (these support IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "DonorQuery_sid_idx" ON "DonorQuery"("sid");
CREATE INDEX IF NOT EXISTS "DonorQuery_status_idx" ON "DonorQuery"("status");
CREATE INDEX IF NOT EXISTS "DonorQuery_assignedToId_idx" ON "DonorQuery"("assignedToId");
CREATE INDEX IF NOT EXISTS "DonorQuery_resolvedById_idx" ON "DonorQuery"("resolvedById");
CREATE INDEX IF NOT EXISTS "DonorQuery_transferredToUserId_idx" ON "DonorQuery"("transferredToUserId"); 