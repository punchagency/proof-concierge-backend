import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

export const productionUsersSeed = async (prisma: PrismaClient): Promise<void> => {
  // Hash password function
  const hashPassword = async (password: string): Promise<string> => {
    return argon2.hash(password);
  };
  
  // Get environment variables for production admin credentials
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!superAdminPassword || !adminPassword) {
    console.error('Missing required environment variables: SUPER_ADMIN_PASSWORD and/or ADMIN_PASSWORD');
    return;
  }
  
  // Production admin users data
  const productionAdmins = [
    {
      username: 'proof_super_admin',
      password: await hashPassword(superAdminPassword),
      name: 'Proof Super Admin',
      email: 'support@proofconcierge.com',
      role: UserRole.SUPER_ADMIN,
      avatar: '/images/proof_admin.jpg',
      isActive: true,
    },
    {
      username: 'proof_admin',
      password: await hashPassword(adminPassword),
      name: 'Proof Admin',
      email: 'admin@proofconcierge.com',
      role: UserRole.ADMIN,
      avatar: '/images/proof_admin.jpg',
      isActive: true,
    },
  ];
  
  // Insert production users if they don't exist
  for (const userData of productionAdmins) {
    const existingUser = await prisma.user.findUnique({ 
      where: { username: userData.username } 
    });
    
    if (!existingUser) {
      await prisma.user.create({
        data: userData
      });
      console.log(`Created production user: ${userData.name} (${userData.role})`);
    } else {
      console.log(`Production user ${userData.username} already exists, skipping`);
    }
  }
  
  console.log('Production users seeding completed');
}; 