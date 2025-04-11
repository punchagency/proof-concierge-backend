import { PrismaClient } from '@prisma/client';
async function main() {
  const prisma = new PrismaClient();
  const count = await prisma.ticket.count();
  console.log('Number of tickets in database:', count);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
