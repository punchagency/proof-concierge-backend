# Database Cleanup Scripts

This directory contains scripts for database maintenance operations.

## Clear All Data Except Users

The `clear-data.ts` and `clear-data.js` scripts delete all data from the database except for user records. This is useful for resetting the application state while preserving user accounts.

### Running the TypeScript Script

To run the TypeScript version:

```bash
# From the project root
npx ts-node scripts/clear-data.ts
```

### Running the JavaScript Script

To run the JavaScript version:

```bash
# From the project root
node scripts/clear-data.js
```

### What the Script Does

The script performs the following operations in order:

1. Deletes all messages
2. Deletes all call sessions
3. Deletes all donor queries

The deletion order is important to handle foreign key constraints properly.

### Safety Warning

⚠️ **WARNING**: This script permanently deletes data and cannot be undone. Make sure you have a backup of your database before running it in production environments. 