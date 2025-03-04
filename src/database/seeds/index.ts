import { PrismaClient } from '@prisma/client';
import { donorQueriesSeed } from './donor-queries.seed';
import { usersSeed } from './users.seed';

/**
 * Run all seed functions
 */
export const runSeeds = async (prisma: PrismaClient): Promise<void> => {
  console.log('Starting database seeding...');
  
  try {
    // Run users seed first (since donor queries may reference users)
    await usersSeed(prisma);
    
    // Run donor queries seed
    await donorQueriesSeed(prisma);
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seeding:', error);
    throw error;
  }
}; 