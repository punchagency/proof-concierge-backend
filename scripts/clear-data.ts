import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function tableExists(tableName: string): Promise<boolean> {
  try {
    // Try to query the table to see if it exists
    const result = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `) as { exists: boolean }[];
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

async function clearAllDataExceptUsers(): Promise<void> {
  console.log('Starting database cleanup...');
  
  try {
    // Check and delete messages if table exists
    if (await tableExists('Message')) {
      console.log('Deleting all messages...');
      await prisma.message.deleteMany({});
      console.log('✅ All messages deleted');
    } else {
      console.log('⚠️ Message table does not exist yet, skipping');
    }
    
    // Check and delete call requests if table exists
    if (await tableExists('CallRequest')) {
      console.log('Deleting all call requests...');
      await prisma.callRequest.deleteMany({});
      console.log('✅ All call requests deleted');
    } else {
      console.log('⚠️ CallRequest table does not exist yet, skipping');
    }
    
    // Check and delete call sessions if table exists
    if (await tableExists('CallSession')) {
      console.log('Deleting all call sessions...');
      await prisma.callSession.deleteMany({});
      console.log('✅ All call sessions deleted');
    } else {
      console.log('⚠️ CallSession table does not exist yet, skipping');
    }
    
    // Check and delete donor queries if table exists
    if (await tableExists('DonorQuery')) {
      console.log('Deleting all donor queries...');
      await prisma.donorQuery.deleteMany({});
      console.log('✅ All donor queries deleted');
    } else {
      console.log('⚠️ DonorQuery table does not exist yet, skipping');
    }
    
    console.log('Database cleanup completed successfully!');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
clearAllDataExceptUsers(); 