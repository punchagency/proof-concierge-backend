import axios from 'axios';
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
function generateToken(apiKey: string, secretKey: string, options = {}) {
  const payload = {
    apikey: apiKey,
    permissions: ['allow_join'],
    version: 2,
    ...options,
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

// Function to create a room
async function createRoom(token: string) {
  try {
    const url = 'https://api.videosdk.live/v2/rooms';
    
    logger.log('Creating room...');
    
    const response = await axios.post(url, {}, {
      headers: { Authorization: token },
    });
    
    logger.log('Room created successfully:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    logger.error('Error creating room:', error.response?.data || error.message);
    throw error;
  }
}

// Function to validate a room
async function validateRoom(roomId: string, token: string) {
  try {
    const url = `https://api.videosdk.live/v2/rooms/${roomId}`;
    
    logger.log(`Validating room: ${roomId}`);
    
    const response = await axios.get(url, {
      headers: { Authorization: token },
    });
    
    logger.log('Room validated successfully');
    return response.data;
  } catch (error: any) {
    logger.error('Error validating room:', error.response?.data || error.message);
    throw error;
  }
}

// Function to create a meeting token
async function createMeetingToken(apiKey: string, secretKey: string, roomId: string, isAdmin: boolean = false) {
  try {
    // Create token payload
    const payload = {
      apikey: apiKey,
      permissions: [
        'allow_join', 
        isAdmin ? 'allow_mod' : null, // If admin, allow moderation permissions
      ].filter(Boolean),
      roomId,
      version: 2,
    };

    // Generate JWT token
    const token = jwt.sign(
      payload,
      secretKey,
      {
        algorithm: 'HS256',
        expiresIn: '1h', // Token expires in 1 hour
        jwtid: uuidv4(),
      }
    );
    
    logger.log(`Created meeting token for room: ${roomId}, isAdmin: ${isAdmin}`);
    return token;
  } catch (error: any) {
    logger.error('Error creating meeting token:', error);
    throw error;
  }
}

// Main test function
async function createTestMeeting() {
  let room;
  
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
    // Step 1: Generate management token
    logger.log('STEP 1: Generating management token');
    const managementToken = generateToken(apiKey, secretKey);
    
    // Step 2: Create a room
    logger.log('STEP 2: Creating a test room');
    room = await createRoom(managementToken);
    const roomId = room.roomId;
    
    // Step 3: Validate the room
    logger.log('STEP 3: Validating the room');
    await validateRoom(roomId, managementToken);
    
    // Step 4: Create meeting tokens
    logger.log('STEP 4: Creating meeting tokens');
    const adminToken = await createMeetingToken(apiKey, secretKey, roomId, true);
    const participantToken = await createMeetingToken(apiKey, secretKey, roomId, false);
    
    logger.log('\n\n------------------------------------------------------------');
    logger.log('📹 TEST MEETING DETAILS');
    logger.log('------------------------------------------------------------');
    logger.log('Room ID: ' + roomId);
    logger.log('------------------------------------------------------------');
    logger.log('ADMIN TOKEN:');
    logger.log(adminToken);
    logger.log('------------------------------------------------------------');
    logger.log('PARTICIPANT TOKEN:');
    logger.log(participantToken);
    logger.log('------------------------------------------------------------');
    
    // Instead of direct links, show how to integrate with frontend
    logger.log('FRONTEND INTEGRATION CODE:');
    logger.log('\nReact/React Native Integration:');
    
    const reactCode = `
// For React Web
import { MeetingProvider } from "@videosdk.live/react-sdk";

function JoinMeeting() {
  return (
    <MeetingProvider
      config={{
        meetingId: "${roomId}",
        name: "User's Name",
        micEnabled: true,
        webcamEnabled: true,
      }}
      token="${participantToken}" // For participant
      // token="${adminToken}"   // For admin
    >
      <MeetingView />
    </MeetingProvider>
  );
}

// The MeetingView component would contain your video interface
function MeetingView() {
  const meeting = useMeeting();
  // Add your UI components here
  return (
    <div>
      <h1>Meeting ID: {meeting.meetingId}</h1>
      {/* Your meeting UI */}
    </div>
  );
}
`;
    
    logger.log(reactCode);
    
    logger.log('\nPlain Javascript:');
    const jsCode = `
// For plain JavaScript
import { VideoSDK } from "@videosdk.live/js-sdk";

// Configure authentication token
VideoSDK.config("${participantToken}"); // Or admin token for admin

// Initialize meeting
const meeting = VideoSDK.initMeeting({
  meetingId: "${roomId}",
  name: "User's Name",
  micEnabled: true,
  webcamEnabled: true,
});

// Join the meeting
meeting.join();

// Listen for meeting events
meeting.on("meeting-joined", () => {
  console.log("Meeting joined successfully");
});
`;
    
    logger.log(jsCode);
    
    logger.log('------------------------------------------------------------');
    logger.log('\nDon\'t use direct browser URLs! The VideoSDK is meant to be integrated into your application.');
    logger.log('The tokens will work for 1 hour. The room will be active for 24 hours.');
    logger.log('------------------------------------------------------------\n');
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Run the test
createTestMeeting(); 