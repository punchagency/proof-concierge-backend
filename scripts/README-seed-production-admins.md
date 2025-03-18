# Seeding Production Admin Users

This utility allows you to easily seed production admin users with secure passwords.

## Prerequisites

Before running the seed script, you must set the following environment variables:

- `SUPER_ADMIN_PASSWORD`: Password for the super admin account
- `ADMIN_PASSWORD`: Password for the regular admin account

## How to Use

1. Set the required environment variables:

```bash
# For Linux/Mac
export SUPER_ADMIN_PASSWORD='your-secure-password-here'
export ADMIN_PASSWORD='another-secure-password-here'

# For Windows PowerShell
$env:SUPER_ADMIN_PASSWORD='your-secure-password-here'
$env:ADMIN_PASSWORD='another-secure-password-here'
```

2. Run the seed script:

```bash
npm run seed:production-admins
```

Or with environment variables in a single command:

```bash
# For Linux/Mac
SUPER_ADMIN_PASSWORD='your-secure-password-here' ADMIN_PASSWORD='another-secure-password-here' npm run seed:production-admins

# For Windows PowerShell
$env:SUPER_ADMIN_PASSWORD='your-secure-password-here'; $env:ADMIN_PASSWORD='another-secure-password-here'; npm run seed:production-admins
```

## Production Admin Accounts

The script creates the following admin accounts:

1. Super Admin:
   - Username: `proof_super_admin`
   - Email: `support@proofconcierge.com`
   - Role: `SUPER_ADMIN`

2. Regular Admin:
   - Username: `proof_admin`
   - Email: `admin@proofconcierge.com`
   - Role: `ADMIN`

## Security Notes

- Passwords are securely hashed using Argon2
- The script will not overwrite existing users with the same usernames
- Use strong, unique passwords for production environments
- Consider rotating passwords periodically for enhanced security 