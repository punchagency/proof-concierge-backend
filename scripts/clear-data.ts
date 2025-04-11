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
    // Check and delete text messages if table exists
    if (await tableExists('TextMessage')) {
      console.log('Deleting all text messages...');
      await prisma.textMessage.deleteMany({});
      console.log('✅ All text messages deleted');
    } else {
      console.log('⚠️ TextMessage table does not exist yet, skipping');
    }
    
    // Check and delete calls if table exists
    if (await tableExists('Call')) {
      console.log('Deleting all calls...');
      await prisma.call.deleteMany({});
      console.log('✅ All calls deleted');
    } else {
      console.log('⚠️ Call table does not exist yet, skipping');
    }
    
    // Check and delete tickets if table exists
    if (await tableExists('Ticket')) {
      console.log('Deleting all tickets...');
      await prisma.ticket.deleteMany({});
      console.log('✅ All tickets deleted');
    } else {
      console.log('⚠️ Ticket table does not exist yet, skipping');
    }
    
    // Check and delete ticket transfers if table exists
    if (await tableExists('TicketTransfer')) {
      console.log('Deleting all ticket transfers...');
      await prisma.ticketTransfer.deleteMany({});
      console.log('✅ All ticket transfers deleted');
    } else {
      console.log('⚠️ TicketTransfer table does not exist yet, skipping');
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