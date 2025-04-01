import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

async function tableExists(
  prisma: PrismaClient,
  tableName: string,
): Promise<boolean> {
  try {
    // Try to query the table to see if it exists
    const result = (await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `)) as { exists: boolean }[];
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

export const productionUsersSeed = async (
  prisma: PrismaClient,
): Promise<void> => {
  try {
    // Check if User table exists
    const userTableExists = await tableExists(prisma, 'User');
    if (!userTableExists) {
      console.log('⚠️ User table does not exist yet. Run migrations first.');
      return;
    }

    // Hash password function
    const hashPassword = async (password: string): Promise<string> => {
      return argon2.hash(password);
    };

    // Get environment variables for production admin credentials
    const superAdminPassword =
      process.env.SUPER_ADMIN_PASSWORD || 'default_super_admin_password';
    const adminPassword =
      process.env.ADMIN_PASSWORD || 'default_admin_password';

    if (
      (!superAdminPassword ||
        superAdminPassword === 'default_super_admin_password') &&
      (!adminPassword || adminPassword === 'default_admin_password')
    ) {
      console.warn(
        '⚠️ Using default passwords because SUPER_ADMIN_PASSWORD and/or ADMIN_PASSWORD environment variables are not set',
      );
      console.warn('⚠️ This is not recommended for production environments');
    }

    // Production admin users data
    const productionAdmins = [
      {
        username: 'aravind_devarapalli',
        password: await hashPassword(superAdminPassword),
        name: 'Aravind Devarapalli',
        email: 'Aravind@recoverytrek.com',
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
      {
        username: 'katie',
        password: await hashPassword(adminPassword),
        name: 'Katie',
        email: 'Katie@recoverytrek.com',
        role: UserRole.ADMIN,
        isActive: true,
      },
      {
        username: 'proof_admin',
        password: await hashPassword(adminPassword),
        name: 'Proof Admin',
        email: 'alabiemmnauel177@gmail.com',
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
    ];

    // Insert production users if they don't exist
    for (const userData of productionAdmins) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { username: userData.username },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: userData,
          });
          console.log(
            `Created production user: ${userData.name} (${userData.role})`,
          );
        } else {
          console.log(
            `Production user ${userData.username} already exists, skipping`,
          );
        }
      } catch (error) {
        console.error(`Error handling user ${userData.username}:`, error);
      }
    }

    console.log('Production users seeding completed');
  } catch (error) {
    console.error('Error in production users seed:', error);
  }
};
