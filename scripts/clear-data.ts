import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clearAllDataExceptUsers(): Promise<void> {
  console.log('Starting database cleanup...');
  
  try {
    // First, delete all messages as they have foreign keys to other tables
    console.log('Deleting all messages...');
    await prisma.message.deleteMany({});
    console.log('✅ All messages deleted');
    
    // Delete all call sessions
    console.log('Deleting all call sessions...');
    await prisma.callSession.deleteMany({});
    console.log('✅ All call sessions deleted');
    
    // Finally, delete all donor queries
    console.log('Deleting all donor queries...');
    await prisma.donorQuery.deleteMany({});
    console.log('✅ All donor queries deleted');
    
    console.log('Database cleanup completed successfully! All data except users has been deleted.');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
clearAllDataExceptUsers(); 