import { PrismaClient } from '@prisma/client';
import { productionUsersSeed } from '../src/database/seeds/production-users.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting production admin users seed process...');
  
  try {
    // Run production users seed
    await productionUsersSeed(prisma);
    
    console.log('Production admin users seed process completed successfully');
  } catch (error) {
    console.error('Error during production admin users seed process:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 