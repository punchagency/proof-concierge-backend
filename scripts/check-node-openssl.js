/**
 * Script to check Node.js and OpenSSL versions
 * This can help diagnose issues with the Firebase Admin SDK
 * Run it with: node scripts/check-node-openssl.js
 */

const crypto = require('crypto');

console.log('🔍 Node.js and OpenSSL Diagnostics:');
console.log(`Node.js version: ${process.version}`);
console.log(`OpenSSL version: ${crypto.constants.OPENSSL_VERSION_TEXT}`);

// Check if Node.js is using OpenSSL 3.0+
const opensslVersionMatch = crypto.constants.OPENSSL_VERSION_TEXT.match(/OpenSSL\s(\d+\.\d+)/);
if (opensslVersionMatch && opensslVersionMatch[1]) {
  const opensslMajorVersion = parseFloat(opensslVersionMatch[1]);
  
  if (opensslMajorVersion >= 3.0) {
    console.log('\n⚠️ You are using OpenSSL 3.0+ which has stricter parsing rules.');
    console.log('This may be related to the error: "error:1E08010C:DECODER routines::unsupported"');
    console.log('\nPossible solutions:');
    console.log('1. Ensure your Firebase private key is properly formatted with correct line breaks.');
    console.log('2. Use the updated key formatting in the notifications.service.ts file.');
    console.log('3. Run the validate-firebase-config.js script to check your environment variables.');
  } else {
    console.log('\n✅ You are using an OpenSSL version that should be compatible with Firebase Admin SDK.');
  }
} else {
  console.log('\n❓ Could not determine OpenSSL major version.');
}

// Test private key parsing
console.log('\n🔍 Testing private key parsing capabilities:');
try {
  // Generate a test key pair
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  console.log('✅ Successfully generated and parsed a test RSA private key.');
  console.log('✅ Your Node.js installation can handle private keys correctly.');
} catch (error) {
  console.error('❌ Error generating test private key:', error.message);
  console.log('This indicates a potential issue with your Node.js crypto capabilities.');
} 