import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import { productionUsersSeed } from '../src/database/seeds/production-users.seed';

const execPromise = promisify(exec);
const prisma = new PrismaClient();

/**
 * This script sets up the production database by:
 * 1. Running Prisma migrations
 * 2. Seeding production admin users
 */
async function setupProductionDatabase(): Promise<void> {
  console.log('Setting up production database...');
  
  try {
    // Step 1: Run Prisma migrations
    console.log('Running Prisma migrations...');
    try {
      const { stdout, stderr } = await execPromise('npx prisma migrate deploy');
      console.log(stdout);
      if (stderr) console.error(stderr);
      console.log('✅ Prisma migrations completed successfully');
    } catch (error) {
      console.error('Error running Prisma migrations:', error);
      return;
    }
    
    // Step 2: Seed production admin users
    console.log('Seeding production admin users...');
    await productionUsersSeed(prisma);
    console.log('✅ Production admin users seeded successfully');
    
    console.log('✅ Production database setup completed successfully');
  } catch (error) {
    console.error('Error setting up production database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupProductionDatabase(); 