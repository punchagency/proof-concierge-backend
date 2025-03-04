import { PrismaClient } from '@prisma/client';
import { runSeeds } from './seeds';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');
  
  try {
    // Run all seeds
    await runSeeds(prisma);
    
    console.log('Seed process completed successfully');
  } catch (error) {
    console.error('Error during seed process:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 