# Proof Concierge Backend - System Documentation

## 1. System Overview

The Proof Concierge Backend is a comprehensive support ticketing system built using NestJS, designed to facilitate communication between donors and admin support staff. The system enables donors to create support queries, engage in real-time chat, request video/audio calls, and receive timely assistance from admin users.

### 1.1 Key Features

- **Support Ticketing System**: Create and manage donor queries (support tickets)
- **Real-time Communication**: Chat messaging with WebSocket support for instant updates
- **Video/Audio Calling**: Integrated with VideoSDK for seamless video and audio communication
- **Role-based Access Control**: Different permissions for donors and admin users
- **Push Notifications**: Firebase Cloud Messaging integration for mobile notifications
- **Health Monitoring**: Comprehensive health check endpoints for system status

## 2. System Architecture

### 2.1 Technology Stack

- **Backend Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **API**: RESTful API with versioning
- **Real-time Communication**: WebSockets
- **Video/Audio Calls**: VideoSDK integration
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Authentication**: JWT-based authentication
- **Deployment**: Compatible with various cloud platforms (Heroku, AWS, etc.)

### 2.2 Core Components

The system is built as a modular NestJS application with the following key modules:

1. **Auth Module**: Handles authentication, authorization, and user management
2. **Donor Queries Module**: Core module for managing support tickets
3. **Messages Module**: Handles chat and system messages
4. **Communication Module**: Manages video/audio calls and integrates with VideoSDK
5. **Notifications Module**: Handles push notifications via FCM
6. **Health Module**: Provides system health monitoring endpoints
7. **Database Module**: Manages database connections and operations via Prisma

### 2.3 Database Schema

The database uses a relational model with the following key entities:

1. **User**: Admin users with roles and authentication information
2. **DonorQuery**: Support tickets created by donors
3. **Message**: Chat and system messages associated with queries
4. **CallSession**: Video/audio call sessions
5. **CallRequest**: Requests for calls made by donors

### 2.4 System Flow

1. **Donor Query Creation**:
   - Donors create queries without authentication
   - System assigns a unique ID and sets status to IN_PROGRESS
   - Admins can view and accept queries

2. **Communication Flow**:
   - Messages are exchanged between donors and admins
   - Real-time updates via WebSockets
   - System messages track important events

3. **Call Flow**:
   - Donors can request calls
   - Admins accept/reject call requests
   - Call sessions are created using VideoSDK
   - Both parties receive tokens to join the call

4. **Query Resolution Flow**:
   - Admins can resolve queries
   - Donors can now close their own queries
   - Queries can be transferred to other admins if needed

## 3. API Endpoints

The API is organized into logical groups based on functionality:

### 3.1 Authentication Endpoints

| Method | Endpoint        | Description                                      | Authentication |
|--------|-----------------|--------------------------------------------------|----------------|
| POST   | /auth/login     | Authenticate user and receive JWT                | Public         |

### 3.2 Donor Query Endpoints

| Method | Endpoint                           | Description                                 | Authentication |
|--------|-----------------------------------|---------------------------------------------|----------------|
| POST   | /donor-queries                    | Create a new donor query                    | Public         |
| GET    | /donor-queries/:id                | Get query by ID                             | Public         |
| GET    | /donor-queries/user?donorId=...   | Get queries by donor ID                     | Public         |
| GET    | /donor-queries/general            | Get in-progress queries with filters        | Public         |
| POST   | /donor-queries/:id/donor-close    | Allow donors to close their own requests    | Public         |
| GET    | /donor-queries                    | List all queries                            | Admin          |
| GET    | /donor-queries/admin/:id          | Get query by ID (admin view)                | Admin          |
| GET    | /donor-queries/in-progress        | Get in-progress queries                     | Admin          |
| GET    | /donor-queries/resolved           | Get resolved queries                        | Admin          |
| GET    | /donor-queries/transferred        | Get transferred queries                     | Admin          |
| PATCH  | /donor-queries/:id                | Update a query                              | Admin          |
| PATCH  | /donor-queries/:id/resolve        | Resolve a query                             | Admin          |
| PATCH  | /donor-queries/:id/transfer       | Transfer a query to another admin           | Admin          |
| POST   | /donor-queries/:id/send-reminder  | Send a reminder for a query                 | Admin          |
| DELETE | /donor-queries/:id                | Delete a query                              | Admin          |
| PATCH  | /donor-queries/:id/accept         | Accept a query for resolution               | Admin          |

### 3.3 Messages Endpoints

| Method | Endpoint                            | Description                               | Authentication |
|--------|-------------------------------------|-------------------------------------------|----------------|
| POST   | /messages                           | Send a message                            | Public         |
| GET    | /messages                           | Get messages with filters                 | Public         |
| GET    | /messages/query/:queryId            | Get messages for a query                  | Public         |
| GET    | /messages/:queryId                  | Get messages for a query (alternative)    | Public         |
| GET    | /messages/between/:userId1/:userId2 | Get messages between two users            | Public         |
| POST   | /messages/admin/:queryId            | Send a message as admin                   | Admin          |
| GET    | /messages/admin/:queryId            | Get messages for a query (admin view)     | Admin          |

### 3.4 Communication Endpoints

| Method | Endpoint                                            | Description                              | Authentication |
|--------|----------------------------------------------------|------------------------------------------|----------------|
| POST   | /communication/call/:queryId                        | Start a new call session                 | Admin          |
| POST   | /communication/call/:roomName/end                   | End an active call                       | Public         |
| PUT    | /communication/call/:roomName/status                | Update call status                       | Public         |
| GET    | /communication/calls/:queryId                       | Get call sessions for a query            | Public         |
| POST   | /communication/call/:queryId/request                | Request a call session                   | Public         |
| GET    | /communication/call/:queryId/requests               | Get call requests for a query            | Admin          |
| POST   | /communication/call/:queryId/accept-request/:reqId  | Accept a specific call request           | Admin          |
| POST   | /communication/call/:queryId/accept-request         | Accept the most recent call request      | Admin          |
| POST   | /communication/call/:queryId/reject-request/:reqId  | Reject a call request                    | Admin          |
| DELETE | /communication/call/:roomName                       | Delete a room                            | Admin          |

### 3.5 User Management Endpoints

| Method | Endpoint               | Description                          | Authentication |
|--------|-----------------------|--------------------------------------|----------------|
| PUT    | /users/me/fcm-token   | Update FCM token for notifications   | Admin          |
| PUT    | /users/me/profile     | Update user profile                  | Admin          |
| PUT    | /users/me/password    | Change password                      | Admin          |
| POST   | /users/me/avatar      | Upload profile picture               | Admin          |

### 3.6 Health Check Endpoints

| Method | Endpoint           | Description                           | Authentication |
|--------|-------------------|---------------------------------------|----------------|
| GET    | /health           | Basic health check                     | Public         |
| GET    | /health/ping      | Simple ping endpoint                   | Public         |
| GET    | /health/advanced  | Detailed system health information     | Public         |

## 4. Authentication & Authorization

### 4.1 Authentication Flow

The system uses JWT-based authentication:

1. Admin users authenticate via the `/auth/login` endpoint
2. The system verifies credentials and issues a JWT token
3. The token contains user ID, username, and role information
4. The token is included in the Authorization header for protected endpoints
5. Public endpoints are marked with the `@Public()` decorator to bypass authentication

### 4.2 Role-based Access Control

The system implements role-based authorization:

1. Roles include SUPER_ADMIN and ADMIN
2. The `@Roles()` decorator is used to restrict access to specific endpoints
3. The `RolesGuard` enforces role-based access control
4. SUPER_ADMIN has full access to all endpoints
5. ADMIN has access to most management features except sensitive operations

### 4.3 Public vs. Protected Routes

- **Public Routes**: Accessible without authentication, mostly for donor-facing features
- **Protected Routes**: Require valid JWT and appropriate role, mostly for admin features

## 5. Real-time Communication

### 5.1 WebSocket Integration

The system uses WebSockets for real-time updates:

1. Clients connect to the WebSocket server on application load
2. Events are emitted when:
   - New messages are created
   - Query status changes
   - Call requests/sessions are updated
3. Clients receive these events and update their UI accordingly

### 5.2 Push Notifications

For mobile clients, the system uses Firebase Cloud Messaging:

1. Clients register their FCM tokens
2. The server sends push notifications for:
   - New messages
   - Status changes
   - Call requests/acceptances
3. Mobile clients receive notifications even when the app is in the background

## 6. Video/Audio Call System

### 6.1 VideoSDK Integration

The system integrates with VideoSDK for video/audio calls:

1. Admin initiates a call or accepts a donor's call request
2. The system creates a room on VideoSDK
3. Generates secure tokens for both the admin and donor
4. Participants join the call using these tokens

### 6.2 Call Request Flow

1. Donor requests a call (video or audio)
2. Admin receives notification of the request
3. Admin accepts or rejects the request
4. If accepted, a call session is created
5. Both parties can join the call

## 7. Database Models and Relationships

### 7.1 User Model

```
User {
  id          Int       @id @default(autoincrement())
  username    String    @unique
  password    String
  name        String?
  email       String?   @unique
  role        Role      @default(ADMIN)
  avatar      String?
  isActive    Boolean   @default(true)
  fcmToken    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relationships
  queries     DonorQuery[]  @relation("AssignedQueries")
  resolvedQueries DonorQuery[] @relation("ResolvedQueries")
  transferredQueries DonorQuery[] @relation("TransferredQueries")
  sentMessages Message[] @relation("SentMessages")
  receivedMessages Message[] @relation("ReceivedMessages")
  callSessions CallSession[]
  callRequests CallRequest[]
}
```

### 7.2 DonorQuery Model

```
DonorQuery {
  id          Int         @id @default(autoincrement())
  sid         String?     @unique
  donor       String
  donorId     String
  test        String?
  stage       String?
  queryMode   QueryMode?  @default(TEXT)
  device      String?
  status      QueryStatus @default(IN_PROGRESS)
  fcmToken    String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  transferredTo String?
  transferredToUserId Int?
  transferNote String?
  resolvedById Int?
  assignedToId Int?
  
  // Relationships
  assignedTo  User?       @relation("AssignedQueries", fields: [assignedToId], references: [id])
  resolvedBy  User?       @relation("ResolvedQueries", fields: [resolvedById], references: [id])
  transferredToUser User? @relation("TransferredQueries", fields: [transferredToUserId], references: [id])
  messages    Message[]
  callSessions CallSession[]
  callRequests CallRequest[]
}
```

### 7.3 Message Model

```
Message {
  id          Int         @id @default(autoincrement())
  content     String
  queryId     Int?
  isFromAdmin Boolean     @default(false)
  senderId    Int?
  recipientId Int?
  fcmToken    String?
  callSessionId Int?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  messageType MessageType @default(CHAT)
  callMode    CallMode?
  roomName    String?
  callRequestId Int?
  
  // Relationships
  query       DonorQuery? @relation(fields: [queryId], references: [id])
  sender      User?       @relation("SentMessages", fields: [senderId], references: [id])
  recipient   User?       @relation("ReceivedMessages", fields: [recipientId], references: [id])
  callSession CallSession? @relation(fields: [callSessionId], references: [id])
  callRequest CallRequest? @relation(fields: [callRequestId], references: [id])
}
```

### 7.4 CallSession Model

```
CallSession {
  id          Int         @id @default(autoincrement())
  queryId     Int
  adminId     Int
  roomName    String      @unique
  mode        CallMode    @default(VIDEO)
  status      CallStatus  @default(CREATED)
  startedAt   DateTime?
  endedAt     DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  adminToken  String?
  userToken   String?
  
  // Relationships
  query       DonorQuery  @relation(fields: [queryId], references: [id])
  admin       User        @relation(fields: [adminId], references: [id])
  messages    Message[]
}
```

### 7.5 CallRequest Model

```
CallRequest {
  id          Int               @id @default(autoincrement())
  queryId     Int
  adminId     Int?
  mode        CallMode          @default(VIDEO)
  message     String?
  status      CallRequestStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  // Relationships
  query       DonorQuery        @relation(fields: [queryId], references: [id])
  admin       User?             @relation(fields: [adminId], references: [id])
  messages    Message[]
}
```

## 8. Deployment and Environment Configuration

### 8.1 Environment Variables

The application requires the following environment variables:

```
# Application
PORT=5005
NODE_ENV=development # development, production, test

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/proof_concierge"

# Authentication
JWT_SECRET=your_jwt_secret_here

# Admin Users Credentials (for production seeding)
SUPER_ADMIN_PASSWORD=your_secure_super_admin_password
ADMIN_PASSWORD=your_secure_admin_password

# Video Calls (VideoSDK)
VIDEOSDK_API_KEY=your_videosdk_api_key
VIDEOSDK_SECRET_KEY=your_videosdk_secret_key

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
FCM_SERVER_KEY=your_fcm_server_key

# Build and Deployment Control
# Set to 'true' to skip database migrations and seeding during prebuild
SKIP_PREBUILD=false
# Set to 'true' to force prebuild steps even in non-production environments
FORCE_PREBUILD=false

# Logging
LOG_LEVEL=info # error, warn, info, debug
```

### 8.2 Deployment Process

The application includes scripts for deployment:

1. **Prebuild Step**: Controlled by the `skip-prebuild.js` script
   - Runs database migrations and seeds admin users
   - Can be skipped based on environment variables

2. **Build Process**:
   - Compiles TypeScript to JavaScript
   - Generates Prisma client

3. **Start Command**:
   - Starts the application using Node.js

### 8.3 Database Setup

1. **Migrations**: Apply schema changes using Prisma migrations
   ```
   npx prisma migrate deploy
   ```

2. **Seeding**: Seed the database with initial data
   ```
   npm run seed:production-admins
   ```

## 9. Testing and Quality Assurance

### 9.1 Testing Strategy

The application supports different types of tests:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test interactions between components
3. **End-to-End Tests**: Test complete user flows

### 9.2 Test Environment

Tests can be run in a dedicated test environment:

1. Set `NODE_ENV=test`
2. Configure a test database
3. Run tests using `npm run test`

## 10. Security Considerations

### 10.1 Authentication Security

1. JWT tokens are signed with a secure secret
2. Passwords are hashed using bcrypt
3. Token expiration is enforced

### 10.2 Data Security

1. Database connections use SSL
2. Sensitive data is encrypted
3. Input validation prevents injection attacks

### 10.3 API Security

1. CORS configuration restricts allowed origins
2. Rate limiting prevents abuse
3. Request validation ensures data integrity

## 11. Performance Optimization

### 11.1 Database Optimization

1. Indexes on frequently queried fields
2. Connection pooling for efficient database usage
3. Query optimization to reduce database load

### 11.2 Response Optimization

1. Data pagination for large result sets
2. Response caching where appropriate
3. Efficient data serialization

## 12. Troubleshooting and Monitoring

### 12.1 Logging

The application uses structured logging:

1. Different log levels based on severity
2. Request/response logging for debugging
3. Error logging with stack traces

### 12.2 Health Checks

Health check endpoints provide system status:

1. `/health`: Basic system status
2. `/health/ping`: Simple availability check
3. `/health/advanced`: Detailed system information

### 12.3 Common Issues

1. **Database Connection Issues**:
   - Check DATABASE_URL environment variable
   - Verify network connectivity
   - Check database server status

2. **Authentication Issues**:
   - Verify JWT_SECRET is set correctly
   - Check token expiration
   - Ensure user credentials are valid

3. **Video Call Issues**:
   - Verify VIDEOSDK_API_KEY and VIDEOSDK_SECRET_KEY
   - Check network connectivity
   - Ensure browser supports WebRTC

## 13. Future Enhancements

Potential future enhancements for the system:

1. **Analytics Dashboard**: Track query resolution times and admin performance
2. **Query Prioritization**: Implement urgency levels and queue management
3. **Self-Service Options**: Add FAQ integration and guided troubleshooting
4. **Advanced Search**: Implement full-text search for queries and messages
5. **Multi-language Support**: Add translation capabilities for global support
6. **Knowledge Base Integration**: Link queries to relevant help articles
7. **Audit Trails**: Track all actions for compliance and quality assurance
8. **User Experience Improvements**: Add dark mode and accessibility features
9. **Mobile Applications**: Develop dedicated mobile apps for admins
10. **AI Assistance**: Implement AI-powered suggestions for admins

## 14. Conclusion

The Proof Concierge Backend provides a robust foundation for a support ticketing system with real-time communication capabilities. Its modular architecture allows for easy extension and customization, while its comprehensive API enables integration with various frontend applications and third-party services.

---

*Document Version: 1.0*
*Last Updated: 2024* 