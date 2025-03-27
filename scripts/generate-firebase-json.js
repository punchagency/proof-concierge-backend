/**
 * Script to generate a Firebase service account JSON file from environment variables
 * Run with: node scripts/generate-firebase-json.js
 * 
 * This creates a temporary solution for Firebase authentication issues
 * by generating a service account JSON file that can be used directly.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'firebase-service-account.json');

function generateFirebaseServiceAccountJson() {
  console.log('🔍 Generating Firebase service account JSON file from environment variables...');
  
  // Get Firebase configuration from environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing required Firebase configuration environment variables.');
    console.error('Required variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    return false;
  }
  
  // Create the service account JSON structure
  const serviceAccount = {
    type: 'service_account',
    project_id: projectId,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || generateRandomKeyId(),
    private_key: privateKey,
    client_email: clientEmail,
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
    universe_domain: 'googleapis.com'
  };
  
  try {
    // Write the JSON to a file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(serviceAccount, null, 2));
    console.log(`✅ Firebase service account JSON file generated at: ${OUTPUT_PATH}`);
    
    // Output Heroku config set command
    console.log('\n📝 To use this file in Heroku, run:');
    console.log(`heroku config:set GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account.json -a your-app-name`);
    
    // Output code modification suggestion
    console.log('\n📝 Then add this to src/notifications/notifications.service.ts in onModuleInit():');
    console.log('```typescript');
    console.log('// Try to use the service account file if available');
    console.log('if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {');
    console.log('  try {');
    console.log('    const serviceAccountPath = path.join(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);');
    console.log('    if (fs.existsSync(serviceAccountPath)) {');
    console.log('      this.logger.log(`Using service account file: ${serviceAccountPath}`);');
    console.log('      this.adminApp = admin.initializeApp({');
    console.log('        credential: admin.credential.cert(serviceAccountPath)');
    console.log('      });');
    console.log('      this.isInitialized = true;');
    console.log('      this.logger.log(\'Firebase Admin SDK initialized successfully with service account file\');');
    console.log('      return;');
    console.log('    }');
    console.log('  } catch (error) {');
    console.log('    this.logger.error(\'Error loading service account file:\', error);');
    console.log('    // Continue with regular initialization');
    console.log('  }');
    console.log('}');
    console.log('```');
    
    return true;
  } catch (error) {
    console.error('❌ Error generating Firebase service account JSON file:', error.message);
    return false;
  }
}

// Generate a random key ID if not provided
function generateRandomKeyId() {
  return Array.from({ length: 40 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Run the function
generateFirebaseServiceAccountJson(); 