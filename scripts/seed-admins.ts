import { PrismaClient } from '@prisma/client';
import { usersSeed } from '../src/database/seeds/users.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting admin users seed process...');
  
  try {
    // Run only users seed
    await usersSeed(prisma);
    
    console.log('Admin users seed process completed successfully');
  } catch (error) {
    console.error('Error during admin users seed process:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 