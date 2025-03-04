# Database Seeding

This directory contains scripts for seeding the database with initial data.

## Structure

- `seed.ts`: Main script to run the seeding process
- `seeds/index.ts`: Orchestrates all seed functions
- `seeds/donor-queries.seed.ts`: Seeds donor queries data

## Running Seeds

To seed the database with initial data, run:

```bash
npm run seed
# or
pnpm seed
```

## Adding New Seeds

To add a new seed file:

1. Create a new file in the `seeds` directory (e.g., `my-entity.seed.ts`)
2. Export a seed function that accepts a DataSource
3. Import and call your seed function in `seeds/index.ts`

Example:

```typescript
// my-entity.seed.ts
import { DataSource } from 'typeorm';
import { MyEntity } from '../../my-entity/my-entity.entity';

export const myEntitySeed = async (dataSource: DataSource): Promise<void> => {
  const repository = dataSource.getRepository(MyEntity);
  
  // Clear existing data
  await repository.clear();
  
  // Add new data
  const entities = [
    { /* entity data */ },
    { /* entity data */ },
  ];
  
  for (const entity of entities) {
    await repository.save(entity);
  }
  
  console.log(`Seeded ${entities.length} entities`);
};
```

Then update `seeds/index.ts`:

```typescript
import { DataSource } from 'typeorm';
import { donorQueriesSeed } from './donor-queries.seed';
import { myEntitySeed } from './my-entity.seed';

export const runSeeds = async (dataSource: DataSource): Promise<void> => {
  console.log('Starting database seeding...');
  
  try {
    // Run donor queries seed
    await donorQueriesSeed(dataSource);
    
    // Run my entity seed
    await myEntitySeed(dataSource);
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seeding:', error);
    throw error;
  }
}; 