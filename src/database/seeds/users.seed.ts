import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

export const usersSeed = async (prisma: PrismaClient): Promise<void> => {
  // Hash password function
  const hashPassword = async (password: string): Promise<string> => {
    return argon2.hash(password);
  };
  
  // Admin users data
  const adminUsers = [
    {
      username: 'super_admin',
      password: await hashPassword('password123'),
      name: 'Super Admin',
      email: 'super.admin@proof.com',
      role: UserRole.SUPER_ADMIN,
      avatar: '/images/super_admin.jpg',
      isActive: true,
    },
    {
      username: 'admin1',
      password: await hashPassword('password123'),
      name: 'John Admin',
      email: 'john.admin@proof.com',
      role: UserRole.ADMIN,
      avatar: '/images/admin1.jpg',
      isActive: true,
    },
    {
      username: 'admin2',
      password: await hashPassword('password123'),
      name: 'Sarah Admin',
      email: 'sarah.admin@proof.com',
      role: UserRole.ADMIN,
      avatar: '/images/admin2.jpg',
      isActive: true,
    },
    {
      username: 'admin3',
      password: await hashPassword('password123'),
      name: 'Michael Admin',
      email: 'michael.admin@proof.com',
      role: UserRole.ADMIN,
      avatar: '/images/admin3.jpg',
      isActive: true,
    },
    {
      username: 'admin4',
      password: await hashPassword('password123'),
      name: 'Emma Admin',
      email: 'emma.admin@proof.com',
      role: UserRole.ADMIN,
      avatar: '/images/admin4.jpg',
      isActive: true,
    },
  ];
  
  // Insert users if they don't exist
  for (const userData of adminUsers) {
    const existingUser = await prisma.user.findUnique({ 
      where: { username: userData.username } 
    });
    
    if (!existingUser) {
      await prisma.user.create({
        data: userData
      });
      console.log(`Created user: ${userData.name} (${userData.role})`);
    } else {
      console.log(`User ${userData.username} already exists, skipping`);
    }
  }
  
  console.log('Users seeding completed');
}; 