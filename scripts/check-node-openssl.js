/**
 * Script to check Node.js and OpenSSL versions
 * This can help diagnose issues with the Firebase Admin SDK
 * Run it with: node scripts/check-node-openssl.js
 */

const crypto = require('crypto');

console.log('🔍 Node.js and OpenSSL Diagnostics:');
console.log(`Node.js version: ${process.version}`);

// Try to get OpenSSL version - it might be undefined on some platforms
try {
  const opensslVersion = crypto.constants.OPENSSL_VERSION_TEXT || 
                        (crypto.getCipherInfo ? crypto.getCipherInfo('aes-256-cbc').openssl_version : undefined);
  
  console.log(`OpenSSL version: ${opensslVersion || 'Could not determine'}`);
  
  // Check if Node.js is using OpenSSL 3.0+
  if (opensslVersion) {
    const opensslVersionMatch = opensslVersion.match(/OpenSSL\s(\d+\.\d+)/);
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
      console.log('\n❓ Could not determine OpenSSL major version from string:', opensslVersion);
    }
  } else {
    console.log('\n⚠️ Could not determine OpenSSL version.');
    console.log('Heroku might be using a custom Node.js build or restricting access to OpenSSL version info.');
    console.log('This could be related to the Firebase credential parsing issues.');
  }
} catch (error) {
  console.log('\n⚠️ Error checking OpenSSL version:', error.message);
  console.log('This is not critical but indicates we cannot verify OpenSSL compatibility.');
}

console.log('\n🔍 Node runtime environment:');
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`Node.js flags: ${process.execArgv.join(' ') || 'none'}`);

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
  
  // Check if we can create a PEM-formatted RSA key
  try {
    const sign = crypto.createSign('sha256');
    sign.update('test data');
    sign.sign(privateKey);
    console.log('✅ Successfully signed data with the test RSA private key.');
  } catch (error) {
    console.error('❌ Error signing with the test private key:', error.message);
    console.log('This could indicate issues with private key handling similar to Firebase's problem.');
  }
} catch (error) {
  console.error('❌ Error generating test private key:', error.message);
  console.log('This indicates a potential issue with your Node.js crypto capabilities.');
} 