import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting update of call-started messages...');
    
    const result = await prisma.message.updateMany({
      where: {
        messageType: 'CALL_STARTED',
        content: {
          contains: 'Call started by admin'
        },
        isFromAdmin: false
      },
      data: {
        isFromAdmin: true
      }
    });
    
    console.log(`Updated ${result.count} call-started messages to have isFromAdmin = true`);
  } catch (error) {
    console.error('Error updating messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 