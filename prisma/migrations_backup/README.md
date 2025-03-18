# Database Migrations

This directory contains SQL migration files for the Proof Concierge database.

## How to Apply Migrations

### 1. Using Prisma Migrate (Recommended)

Update your schema.prisma file with the new fields and relations, then run:

```bash
npx prisma migrate dev --name add_assigned_to_id
```

This will create a new migration file and apply it to your database.

### 2. Manual Migration

If you prefer to apply the migration manually, you can run the SQL file directly:

```bash
psql -U your_username -d your_database_name -f ./migrations/add_assigned_to_id.sql
```

Then update your Prisma client:

```bash
npx prisma generate
```

## Migration Files

- `add_assigned_to_id.sql`: Adds the `assignedToId` field to the `DonorQuery` table to track which admin is handling a query.

## After Migration

After applying the migration, restart your application to ensure the new schema is properly loaded. 