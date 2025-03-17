const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Function to execute shell commands
function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    throw error;
  }
}

// Main function to apply schema changes
async function applySchemaChanges() {
  try {
    // Check if DATABASE_URL is set
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('\x1b[31mERROR: DATABASE_URL environment variable is not set.\x1b[0m');
      console.error('Please make sure you have a .env file with a valid DATABASE_URL.');
      console.error('Example: DATABASE_URL="postgresql://username:password@localhost:5432/database_name"');
      process.exit(1);
    }

    console.log('Applying database migration...');
    
    // Generate a migration directly from the schema.prisma file
    try {
      runCommand('npx prisma migrate dev --name simplify_query_schema');
      console.log('Migration applied successfully!');
    } catch (error) {
      console.error('Error applying schema changes:', error.message);
      
      // If migration fails, try a direct database update
      console.log('Attempting direct database update...');
      
      // Create a SQL file with the necessary changes
      const sqlContent = `
-- Drop existing enums if they exist
DROP TYPE IF EXISTS "QueryStatus" CASCADE;
DROP TYPE IF EXISTS "QueryMode" CASCADE;

-- Create new enums
CREATE TYPE "QueryStatus" AS ENUM ('IN_PROGRESS', 'RESOLVED', 'TRANSFERRED');
CREATE TYPE "QueryMode" AS ENUM ('TEXT', 'HUDDLE', 'VIDEO_CALL');

-- Check if sid column exists and remove it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DonorQuery' AND column_name = 'sid'
  ) THEN
    ALTER TABLE "DonorQuery" DROP COLUMN "sid";
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DonorQuery' AND column_name = 'status'
  ) THEN
    ALTER TABLE "DonorQuery" ADD COLUMN "status" "QueryStatus" DEFAULT 'IN_PROGRESS';
  END IF;
END $$;

-- Make queryMode optional if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DonorQuery') THEN
    -- Check if queryMode column exists before trying to modify it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'DonorQuery' AND column_name = 'queryMode'
    ) THEN
      ALTER TABLE "DonorQuery" ALTER COLUMN "queryMode" DROP NOT NULL;
    END IF;
    
    -- Create indexes only if columns exist
    CREATE INDEX IF NOT EXISTS "DonorQuery_id_idx" ON "DonorQuery"("id");
    
    -- Check if status column exists before creating index
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'DonorQuery' AND column_name = 'status'
    ) THEN
      CREATE INDEX IF NOT EXISTS "DonorQuery_status_idx" ON "DonorQuery"("status");
    END IF;
    
    -- Check if assignedToId column exists before creating index
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'DonorQuery' AND column_name = 'assignedToId'
    ) THEN
      CREATE INDEX IF NOT EXISTS "DonorQuery_assignedToId_idx" ON "DonorQuery"("assignedToId");
    END IF;
    
    -- Check if resolvedById column exists before creating index
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'DonorQuery' AND column_name = 'resolvedById'
    ) THEN
      CREATE INDEX IF NOT EXISTS "DonorQuery_resolvedById_idx" ON "DonorQuery"("resolvedById");
    END IF;
    
    -- Check if transferredToUserId column exists before creating index
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'DonorQuery' AND column_name = 'transferredToUserId'
    ) THEN
      CREATE INDEX IF NOT EXISTS "DonorQuery_transferredToUserId_idx" ON "DonorQuery"("transferredToUserId");
    END IF;
  END IF;
END $$;
      `;
      
      const sqlFilePath = path.join(__dirname, 'schema-update.sql');
      fs.writeFileSync(sqlFilePath, sqlContent);
      
      // Execute the SQL file directly using the DATABASE_URL from environment
      try {
        console.log('Attempting to connect to database using psql...');
        
        try {
          // Test database connection first
          runCommand(`psql "${dbUrl}" -c "SELECT 1"`);
        } catch (connectionError) {
          console.error('\x1b[31mERROR: Failed to connect to the database.\x1b[0m');
          console.error('Please check your DATABASE_URL and ensure PostgreSQL is running.');
          console.error('Make sure the user in your connection string exists and has the right permissions.');
          console.error('If you\'re using a default "postgres" user, ensure it exists or create it first.');
          console.error('\nDetailed error:', connectionError.message);
          
          // Clean up the SQL file
          fs.unlinkSync(sqlFilePath);
          process.exit(1);
        }
        
        runCommand(`psql "${dbUrl}" -f ${sqlFilePath}`);
        console.log('Direct database update successful!');
        
        // Generate Prisma client
        runCommand('npx prisma generate');
        console.log('Prisma client generated successfully!');
      } catch (directError) {
        console.error('Error during direct database update:', directError.message);
        throw directError;
      } finally {
        // Clean up the SQL file
        if (fs.existsSync(sqlFilePath)) {
          fs.unlinkSync(sqlFilePath);
        }
      }
    }
  } catch (error) {
    console.error('\x1b[31mFailed to apply schema changes:\x1b[0m', error.message);
    process.exit(1);
  }
}

// Run the migration
applySchemaChanges(); 