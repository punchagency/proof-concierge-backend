# Admin Seeding for Proof Concierge

This document explains how admin users are seeded in the Proof Concierge backend and how they can be used for transferring queries.

## Admin User Structure

Admin users are stored in the `User` entity with the following structure:

```typescript
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string; // Hashed using argon2

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  role: UserRole;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  isActive: boolean;
}
```

## Seeded Admin Users

The following admin users are seeded by default:

1. **Super Admin**
   - Username: super_admin
   - Role: SUPER_ADMIN
   - Email: super.admin@proof.com

2. **John Admin**
   - Username: admin1
   - Role: ADMIN
   - Email: john.admin@proof.com

3. **Sarah Admin**
   - Username: admin2
   - Role: ADMIN
   - Email: sarah.admin@proof.com

4. **Michael Admin**
   - Username: admin3
   - Role: ADMIN
   - Email: michael.admin@proof.com

5. **Emma Admin**
   - Username: admin4
   - Role: ADMIN
   - Email: emma.admin@proof.com

All users have the default password: `password123` (securely hashed using argon2)

## Transferring Queries to Admin Users

Donor queries can be transferred to admin users in two ways:

1. **Using the string-based transfer**:
   ```typescript
   await donorQueriesService.transferQuery(queryId, 'John Admin');
   ```

2. **Using the user-based transfer**:
   ```typescript
   await donorQueriesService.transferQueryToUser(queryId, adminUserId);
   ```

The user-based transfer is preferred as it creates a proper relationship between the query and the admin user.

## API Endpoints

The following API endpoints are available for admin users:

- `GET /users` - Get all users (requires SUPER_ADMIN or ADMIN role)
- `GET /users/:id` - Get a specific user by ID (requires SUPER_ADMIN or ADMIN role)

For transferring queries:

- `PATCH /donor-queries/:id/transfer` - Transfer a query using a string name
- `PATCH /donor-queries/:id/transfer-to-user` - Transfer a query to a specific user by ID

## Frontend Integration

The frontend has been updated to fetch admin users and provide a dropdown for selecting an admin to transfer a query to. This is implemented in the `QueryActions` component.

## Running the Seeds

To run the seeds and populate the database with admin users:

```bash
npm run seed
```

This will run the seed script which will create the admin users and sample donor queries.