import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update all call-started messages to have isFromAdmin = true
  const updatedCount = await prisma.message.updateMany({
    where: {
      messageType: 'CALL_STARTED',
      content: {
        contains: 'Call started by admin'
      }
    },
    data: {
      isFromAdmin: true
    }
  });
  
  console.log(`Updated ${updatedCount.count} call-started messages to have isFromAdmin = true`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 