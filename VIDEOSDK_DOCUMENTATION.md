# VideoSDK Integration and Call Functionality

## Overview

The Proof Concierge backend uses VideoSDK to facilitate real-time video and audio communication between donors and admin users. This integration allows for seamless call management within the application, including creating rooms, generating access tokens, and handling call requests.

## Configuration

### Environment Variables

The VideoSDK integration requires the following environment variables:

```
VIDEOSDK_API_KEY=your_videosdk_api_key
VIDEOSDK_SECRET_KEY=your_videosdk_secret_key
```

These values should be obtained from the VideoSDK dashboard after registering for an account at https://videosdk.live.

## Core Components

### 1. `CallsService` 

Located in `src/communication/services/calls.service.ts`, this service handles all VideoSDK-related operations:

#### Initialization
- Automatically initializes on module startup by reading environment variables
- Validates API key and secret key presence
- Sets up internal state for VideoSDK operations

#### Key Methods

- **createRoom()**: Creates a new VideoSDK room and returns the room ID
- **generateToken(roomId, isAdmin)**: Creates access tokens for participants with appropriate permissions
- **generateManagementToken()**: Creates a management token for VideoSDK API operations
- **startCall(queryId, adminId, mode)**: Initiates a call, creates the room, and generates tokens
- **endCall(roomName, adminId)**: Ends a call and updates status in the database
- **requestCall(queryId, mode)**: Creates a call request from a donor
- **acceptCallRequest(queryId, adminId, callRequestId)**: Accepts a call request and starts the call
- **rejectCallRequest(requestId, adminId)**: Rejects a call request

### 2. `CallsController`

Located in `src/communication/controllers/calls.controller.ts`, this controller exposes HTTP endpoints for call-related operations:

#### Key Endpoints

- **POST `/communication/call/:queryId`**: Start a call (admin only)
- **POST `/communication/call/:roomName/end`**: End a call (admin only)
- **PUT `/communication/call/:roomName/status`**: Update call status
- **DELETE `/communication/call/:roomName`**: Delete a room
- **POST `/communication/call/:queryId/request`**: Request a call (public)
- **GET `/communication/call/:queryId/requests`**: Get pending call requests (admin only)
- **POST `/communication/call/:queryId/accept-request/:requestId`**: Accept a specific call request (admin only)
- **POST `/communication/call/:queryId/accept-request`**: Accept the latest call request (admin only)
- **POST `/communication/call/:queryId/reject-request/:requestId`**: Reject a call request (admin only)
- **GET `/communication/call/calls/:queryId`**: Get call details by query ID
- **GET `/communication/call/call-session/:callSessionId`**: Get call session by ID (admin only)

## Call Flow

### 1. Requesting a Call (Donor Side)

1. Donor initiates a call request through the endpoint: `/communication/call/:queryId/request`
2. CallsService creates a call request record in the database with status `PENDING`
3. A system message is added to the chat indicating the call request
4. If an admin is assigned to the query, a notification is sent via FCM

### 2. Accepting a Call (Admin Side)

1. Admin accepts the call request through one of the accept endpoints
2. CallsService validates admin access to the query
3. The call request status is updated to `ACCEPTED`
4. A new VideoSDK room is created
5. Two tokens are generated: one for the admin and one for the donor
6. The system message is updated with the call details and URL
7. Call session is created in the database with status `CREATED`

### 3. Starting a Call

1. Admin joins the call, triggering the `updateCallStatus` endpoint with status `STARTED`
2. Call session status is updated to `STARTED` and startedAt timestamp is set
3. A system message is added indicating the admin joined the call

### 4. Ending a Call

1. When the call ends, the `endCall` endpoint is called
2. Call session status is updated to `ENDED` and endedAt timestamp is set
3. A system message is added indicating the call ended

## VideoSDK Integration Details

### Room Creation

Rooms are created by making a POST request to the VideoSDK API:
```
POST https://api.videosdk.live/v2/rooms
```

The request requires an authorization header with a management token.

### Token Generation

Two types of tokens are generated:
- **Participant Tokens**: For joining meetings, with limited permissions
- **Management Tokens**: For API operations like creating rooms

Tokens are JWT-based and include:
- API key
- Permissions (e.g., "allow_join", "allow_mod")
- Room ID (for participant tokens)
- Expiry time (2 hours)

### Room URLs

Room URLs follow this format:
```
https://app.videosdk.live/meeting/{roomName}
```

These URLs can be shared with participants to join meetings directly via a browser.

## Database Schema

The call functionality uses these database tables:

### 1. CallSession
- Stores information about active and past calls
- Fields: id, queryId, adminId, roomName, mode, startedAt, endedAt, status, adminToken, userToken

### 2. CallRequest
- Tracks call requests from donors
- Fields: id, queryId, adminId, mode, message, status, createdAt, updatedAt

### 3. Message (call-related)
- Stores system messages about calls
- Relevant fields: callMode, roomName, callSessionId, callRequestId, userToken, adminToken

## Error Handling

The call functionality includes robust error handling:
- Validation of required parameters (queryId, adminId)
- Authentication and authorization checks
- Error logging with detailed information
- Appropriate HTTP status codes and error messages

## Best Practices

1. Always check if VideoSDK is initialized before performing operations
2. Validate user permissions before allowing call management
3. Use appropriate call modes (VIDEO, AUDIO, SCREEN) based on user requirements
4. Handle token expiration (tokens are valid for 2 hours)
5. Monitor active calls to detect and handle abandoned sessions

## Limitations

1. VideoSDK rooms automatically expire after 10 minutes of inactivity (no explicit deletion needed)
2. The system currently doesn't support recording calls
3. Room customization options are limited to the mode (video/audio/screen sharing)

## Troubleshooting

Common issues:
1. Missing environment variables - ensure VIDEOSDK_API_KEY and VIDEOSDK_SECRET_KEY are set
2. Authorization errors - check token generation and permissions
3. Room creation failures - verify API credentials and network connectivity
4. Token expiration - tokens are valid for 2 hours and need to be refreshed for longer sessions

For detailed error logs, check the application logs or enable debug logging for the CallsService.

## Frontend Integration

### Joining a Call (Donor Side)

When a donor needs to join a call, the frontend should:

1. Retrieve the userToken from the message or call session object
2. Load the VideoSDK meeting UI component with the token
3. Connect to the meeting using the roomName

Example code (React):
```jsx
import { MeetingProvider, MeetingConsumer } from '@videosdk.live/react-sdk';

// Inside your component
return (
  <MeetingProvider
    config={{
      meetingId: roomName,
      micEnabled: true,
      webcamEnabled: true,
      name: "Donor",
    }}
    token={userToken}
  >
    <MeetingConsumer>
      {/* Your meeting UI components */}
    </MeetingConsumer>
  </MeetingProvider>
);
```

### Joining a Call (Admin Side)

For admin users, the process is similar but uses the adminToken which has additional moderation privileges:

1. Retrieve the adminToken from the call session
2. Load the VideoSDK meeting UI with moderator controls
3. Connect to the meeting using the roomName
4. Use the VideoSDK API to manage participants if needed

## Migration from Daily.co

This implementation replaces the previous Daily.co integration. Key differences include:

1. Room structure and API endpoints are different
2. Token generation is JWT-based with different permission structures
3. Room URLs follow a different format
4. Room lifecycle management is handled differently (automatic expiration vs. explicit deletion)

All code has been updated to maintain backward compatibility where possible, allowing for a seamless transition from Daily.co to VideoSDK. 