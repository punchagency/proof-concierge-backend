/**
 * Script to validate Firebase configuration
 * This script checks if the Firebase credentials are properly formatted
 * Run it with: node scripts/validate-firebase-config.js
 */

// Load environment variables
require('dotenv').config();

// Function to validate the Firebase private key format
function validateFirebasePrivateKey(privateKey) {
  if (!privateKey) {
    console.error('❌ FIREBASE_PRIVATE_KEY is not defined in environment variables');
    return false;
  }

  // Check if the private key has the correct format
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
    console.error('❌ FIREBASE_PRIVATE_KEY is missing BEGIN/END markers');
    
    // If the key contains escaped newlines, it may need to be processed
    if (privateKey.includes('\\n')) {
      console.log('ℹ️ FIREBASE_PRIVATE_KEY contains escaped newlines (\\n)');
      
      // Try to format the key properly
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      
      // Check if the formatted key has the correct format
      if (formattedKey.includes('-----BEGIN PRIVATE KEY-----') && formattedKey.includes('-----END PRIVATE KEY-----')) {
        console.log('✅ After replacing \\n with newlines, the key format looks correct');
        return true;
      } else {
        console.error('❌ Even after replacing \\n with newlines, the key format is still incorrect');
        return false;
      }
    }
    
    return false;
  }

  console.log('✅ FIREBASE_PRIVATE_KEY has the correct format with BEGIN/END markers');
  return true;
}

// Main validation function
function validateFirebaseConfig() {
  console.log('🔍 Validating Firebase configuration...');
  
  // Check for required Firebase configuration
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  let isValid = true;
  
  // Validate project ID
  if (!projectId) {
    console.error('❌ FIREBASE_PROJECT_ID is not defined in environment variables');
    isValid = false;
  } else {
    console.log(`✅ FIREBASE_PROJECT_ID is set: ${projectId}`);
  }
  
  // Validate client email
  if (!clientEmail) {
    console.error('❌ FIREBASE_CLIENT_EMAIL is not defined in environment variables');
    isValid = false;
  } else {
    console.log(`✅ FIREBASE_CLIENT_EMAIL is set: ${clientEmail}`);
  }
  
  // Validate private key
  const isPrivateKeyValid = validateFirebasePrivateKey(privateKey);
  isValid = isValid && isPrivateKeyValid;
  
  if (isValid) {
    console.log('✅ All Firebase configuration parameters are valid');
  } else {
    console.error('❌ There are issues with the Firebase configuration');
  }
  
  return isValid;
}

// Run the validation
validateFirebaseConfig(); 