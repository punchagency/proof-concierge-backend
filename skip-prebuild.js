/**
 * This script determines whether to skip the prebuild step based on environment variables.
 * Used as a conditional check before running database migrations and seeding in the build process.
 * 
 * Usage in package.json:
 * "prebuild": "node skip-prebuild.js || (npx prisma migrate reset --force && npm run seed:production-admins)"
 * 
 * Environment variables:
 * SKIP_PREBUILD: Set to 'true' to skip the prebuild step (migrations and seeding)
 * NODE_ENV: When set to 'production', prebuild will run unless explicitly skipped
 */

// Determine if prebuild should be skipped
const shouldSkipPrebuild = () => {
  // Check specific environment variable to skip prebuild
  if (process.env.SKIP_PREBUILD === 'true') {
    console.log('🚫 Skipping prebuild step (migrations and seeding) due to SKIP_PREBUILD=true');
    return true;
  }

  // Only run prebuild in production unless FORCE_PREBUILD is set
  if (process.env.NODE_ENV !== 'production' && process.env.FORCE_PREBUILD !== 'true') {
    console.log(`🚫 Skipping prebuild step in ${process.env.NODE_ENV || 'development'} environment. Set FORCE_PREBUILD=true to override.`);
    return true;
  }

  // Run prebuild in production by default
  console.log(`✅ Running prebuild step (migrations and seeding) in ${process.env.NODE_ENV || 'development'} environment.`);
  return false;
};

// Exit with status code 0 to skip prebuild, or 1 to continue with prebuild
process.exit(shouldSkipPrebuild() ? 0 : 1);
