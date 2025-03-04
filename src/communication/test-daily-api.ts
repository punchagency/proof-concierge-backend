import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

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

// Function to create a room
async function createRoom(apiKey: string) {
  try {
    const url = 'https://api.daily.co/v1/rooms';
    
    // Generate a unique room name
    const roomName = `test-room-${Date.now()}`;
    
    // Room configuration based on Daily.co API docs
    const roomConfig = {
      name: roomName,
      properties: {
        max_participants: 2,
        enable_screenshare: true,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expires in 1 hour
      },
      privacy: 'private',
    };
    
    logger.log('Creating room with config:', JSON.stringify(roomConfig, null, 2));
    
    const response = await axios.post(url, roomConfig, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    
    logger.log('Room created successfully:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    logger.error('Error creating room:', error.response?.data || error.message);
    throw error;
  }
}

// Function to delete a room
async function deleteRoom(roomName: string, apiKey: string) {
  try {
    const url = `https://api.daily.co/v1/rooms/${roomName}`;
    
    logger.log(`Deleting room: ${roomName}`);
    
    const response = await axios.delete(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    
    logger.log('Room deleted successfully');
    return response.data;
  } catch (error: any) {
    logger.error('Error deleting room:', error.response?.data || error.message);
    throw error;
  }
}

// Function to create a meeting token
async function createMeetingToken(roomName: string, apiKey: string, isOwner: boolean = false) {
  try {
    const url = 'https://api.daily.co/v1/meeting-tokens';
    
    const tokenConfig = {
      properties: {
        room_name: roomName,
        is_owner: isOwner,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 1 hour
      }
    };
    
    logger.log(`Creating meeting token for room: ${roomName}, isOwner: ${isOwner}`);
    
    const response = await axios.post(url, tokenConfig, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    
    logger.log('Meeting token created successfully');
    return response.data;
  } catch (error: any) {
    logger.error('Error creating meeting token:', error.response?.data || error.message);
    throw error;
  }
}

// Main test function
async function runTest() {
  let room;
  
  // Load environment variables
  const env = loadEnv();
  const apiKey = env.DAILY_API_KEY;
  const domain = env.DAILY_DOMAIN;
  
  if (!apiKey) {
    logger.error('DAILY_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  if (!domain) {
    logger.error('DAILY_DOMAIN environment variable is not set');
    process.exit(1);
  }
  
  logger.log(`Using Daily.co API key: ${apiKey.substring(0, 8)}...`);
  logger.log(`Using Daily.co domain: ${domain}`);
  
  try {
    // Step 1: Create a room
    logger.log('STEP 1: Creating a test room');
    room = await createRoom(apiKey);
    
    // Step 2: Create meeting tokens
    logger.log('STEP 2: Creating meeting tokens');
    const ownerToken = await createMeetingToken(room.name, apiKey, true);
    const participantToken = await createMeetingToken(room.name, apiKey, false);
    
    logger.log('Owner token:', ownerToken.token.substring(0, 20) + '...');
    logger.log('Participant token:', participantToken.token.substring(0, 20) + '...');
    
    // Step 3: Verify room URL
    const expectedUrl = `https://${domain}.daily.co/${room.name}`;
    if (room.url === expectedUrl) {
      logger.log(`Room URL verified: ${room.url}`);
    } else {
      logger.error(`Room URL mismatch. Expected: ${expectedUrl}, Got: ${room.url}`);
    }
    
    // Step 4: Delete the room
    logger.log('STEP 4: Deleting the test room');
    await deleteRoom(room.name, apiKey);
    
    logger.log('Test completed successfully!');
  } catch (error) {
    logger.error('Test failed:', error);
    
    // Cleanup: Delete the room if it was created
    if (room?.name) {
      try {
        logger.log('Attempting to clean up by deleting the room');
        await deleteRoom(room.name, apiKey);
      } catch (cleanupError) {
        logger.error('Failed to clean up room:', cleanupError);
      }
    }
  }
}

// Run the test
runTest(); 