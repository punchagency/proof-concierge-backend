import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Simple logger
const logger = {
  log: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
};

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = envContent.split('\n').reduce((acc, line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);
    
    return envVars;
  } catch (error) {
    logger.error('Failed to load .env file:', error);
    return {};
  }
}

// Generate management token
function generateToken(apiKey: string, secretKey: string) {
  const payload = {
    apikey: apiKey,
    permissions: ['allow_join'],
    version: 2,
  };

  const token = jwt.sign(
    payload,
    secretKey,
    {
      algorithm: 'HS256',
      expiresIn: '24h',
      jwtid: uuidv4(),
    }
  );
  
  return token;
}

// Main function
async function getManagementToken() {
  // Load environment variables
  const env = loadEnv();
  const apiKey = env.VIDEOSDK_API_KEY;
  const secretKey = env.VIDEOSDK_SECRET_KEY;
  
  if (!apiKey) {
    logger.error('VIDEOSDK_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  if (!secretKey) {
    logger.error('VIDEOSDK_SECRET_KEY environment variable is not set');
    process.exit(1);
  }
  
  logger.log(`Using VideoSDK API key: ${apiKey.substring(0, 8)}...`);
  
  try {
    // Generate management token
    const managementToken = generateToken(apiKey, secretKey);
    
    logger.log('-------------------------------------------------------');
    logger.log('YOUR MANAGEMENT TOKEN:');
    logger.log(managementToken);
    logger.log('-------------------------------------------------------');
    logger.log('Use this token in your Authorization header for API calls');
    logger.log('Example:');
    logger.log('curl -X GET https://api.videosdk.live/v2/rooms/ROOM_ID \\');
    logger.log(`  -H "Authorization: ${managementToken}"`);
    
  } catch (error) {
    logger.error('Failed to generate token:', error);
  }
}

// Run the function
getManagementToken(); 