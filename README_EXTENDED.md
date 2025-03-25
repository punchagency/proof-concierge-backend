# Proof Concierge Backend - Extended API Documentation

This document provides a detailed guide to all the API endpoints in the Proof Concierge Backend project. For each endpoint, you can find the request method, URL, required/request parameters, a sample request body, an example response, and a cURL example that you can use in Postman.

---

## Table of Contents

- [Overview](#overview)
- [Authentication & Authorization](#authentication--authorization)
- [Real-time Notifications System](#real-time-notifications-system)
  - [WebSocket Notifications](#websocket-notifications)
  - [Firebase Cloud Messaging (FCM)](#firebase-cloud-messaging-fcm)
  - [Integration Points](#integration-points)
  - [Benefits](#benefits)
- [Public Endpoints](#public-endpoints)
  - [Authentication](#authentication)
    - [POST /auth/login](#post-authlogin)
  - [Health Checks](#health-checks)
    - [GET /health](#get-health)
    - [GET /health/ping](#get-healthping)
    - [GET /health/advanced](#get-healthadvanced)
    - [GET /health/advanced/detailed](#get-healthadvanceddetailed)
  - [Donor Queries](#donor-queries)
    - [POST /donor-queries](#post-donor-queries)
    - [GET /donor-queries/:id](#get-donor-queriesid)
    - [GET /donor-queries/user](#get-donor-queriesuser)
    - [GET /donor-queries/user/:email](#get-donor-queriesuseremailid)
    - [GET /donor-queries/donor/:donorId](#get-donor-queriesdonordonorid)
    - [GET /donor-queries/general](#get-donor-queriesgeneral)
    - [POST /donor-queries/:id/donor-close](#post-donor-queriesiddonor-close)
  - [Messages](#messages)
    - [POST /messages](#post-messages)
    - [GET /messages](#get-messages)
    - [GET /messages/query/:queryId](#get-messagesqueryqueryid)
    - [GET /messages/:queryId](#get-messagesqueryid)
    - [GET /messages/between/:userId1/:userId2](#get-messagesbetweenuserid1userid2)
  - [Communication](#communication)
    - [POST /communication/call/:roomName/end](#post-communicationcallroomnameend)
    - [PUT /communication/call/:roomName/status](#put-communicationcallroomnamestatus)
    - [GET /communication/calls/:queryId](#get-communicationcallsqueryid)
    - [POST /communication/call/:queryId](#post-communicationcallqueryid)
    - [POST /communication/call/:queryId/request](#post-communicationcallqueryidrequest)
    - [GET /communication/call/:queryId/requests](#get-communicationcallqueryidrequests)
    - [POST /communication/call/:queryId/accept-request](#post-communicationcallqueryidaccept-request)
    - [POST /communication/call/:queryId/accept-request/:requestId](#post-communicationcallqueryidaccept-requestrequestid)
    - [POST /communication/call/:queryId/reject-request/:requestId](#post-communicationcallqueryidreject-requestrequestid)
- [Protected Endpoints (Admin/Support Staff)](#protected-endpoints-adminsupport-staff)
  - [User Management](#user-management)
    - [GET /users/me](#get-usersme)
    - [GET /users](#get-users)
    - [GET /users/:id](#get-usersid)
    - [POST /users](#post-users)
    - [PUT /users/:id](#put-usersid)
    - [DELETE /users/:id](#delete-usersid)
    - [PUT /users/me/fcm-token](#put-usersmefcm-token)
    - [PUT /users/me/profile](#put-usersmeprofile)
    - [PUT /users/me/password](#put-usersmepassword)
    - [POST /users/me/avatar](#post-usersmeavatar)
    - [Messages Management](#messages-management)
      - [POST /messages/admin/:queryId](#post-messagesadminqueryid)
      - [GET /messages/admin/:queryId](#get-messagesadminqueryid)
  - [Donor Queries Management](#donor-queries-management)
    - [GET /donor-queries](#get-donor-queries)
    - [GET /donor-queries/admin/:id](#get-donor-queriesadminid)
    - [GET /donor-queries/in-progress](#get-donor-queriesin-progress)
    - [GET /donor-queries/pending-reply](#get-donor-queriespending-reply)
    - [GET /donor-queries/resolved](#get-donor-queriesresolved)
    - [GET /donor-queries/transferred](#get-donor-queriestransferred)
    - [GET /donor-queries/filtered/statuses](#get-donor-queriesfilteredstatuses)
    - [PATCH /donor-queries/:id](#patch-donor-queriesid)
    - [POST /donor-queries/:id/pending-reply](#post-donor-queriesidpending-reply)
    - [POST /donor-queries/:id/in-progress](#post-donor-queriesidprogress)
    - [PATCH /donor-queries/:id/resolve](#patch-donor-queriesidresolve)
    - [PATCH /donor-queries/:id/transfer](#patch-donor-queriesidtransfer)
    - [POST /donor-queries/:id/send-reminder](#post-donor-queriesidsend-reminder)
    - [DELETE /donor-queries/:id](#delete-donor-queriesid)
    - [PATCH /donor-queries/:id/accept](#patch-donor-queriesidaccept)
  - [Communication Management](#communication-management)
    - [DELETE /communication/call/:roomName](#delete-communicationcallroomname)

---

## Overview

Proof Concierge Backend is a NestJS-based service that handles support tickets (donor queries), messages, call sessions, and additional administrative operations. Public endpoints allow users to submit and view their support queries without authentication, while protected endpoints are used by admins/support staff to manage these queries.

## Authentication & Authorization

- **JWT Authentication:**
  - Protected endpoints require a valid JWT token in the `Authorization` header in the form `Bearer <token>`.
  - The JWT payload contains `sub` (user ID), `username`, and `role`.
  - In controllers, the authenticated user can be accessed via `req.user.userId` (not `req.user.id`).
- **Public Endpoints:**
  - Marked with the `@Public()` decorator to allow access without a token.
- **Role-based Access:**
  - Certain endpoints require roles such as `SUPER_ADMIN` or `ADMIN`; this is enforced via the `RolesGuard` and `@Roles()` decorators.

## Real-time Notifications System

The Proof Concierge Backend implements a robust real-time notification system that keeps clients instantly informed about changes without polling. This is achieved through a combination of WebSockets and Firebase Cloud Messaging (FCM) for mobile push notifications.

### WebSocket Notifications

The system uses Socket.IO (integrated with NestJS's `WebSocketGateway`) to provide real-time updates:

1. **Connection & Authentication**:
   - Clients connect to the WebSocket server at the `/notifications` namespace
   - The WebSocket server is accessible at the path `/api/v1/socket.io`
   - Authentication is performed using the same JWT tokens used for REST API authentication
   - Unauthenticated clients are immediately disconnected
   
2. **Room-based Subscriptions**:
   - Clients are automatically joined to rooms based on their identity:
     - Admins join an "admins" room (`socket.join('admins')`)
     - All users join personal rooms (`socket.join('user-{userId}')`)
   - Clients can manually join query-specific rooms via the `joinQueryRoom` message
   - This room-based approach ensures notifications are only sent to relevant clients

3. **Notification Events**:
   The system emits various event types that clients can listen for:

   | Event | Description | Payload Example |
   |-------|-------------|-----------------|
   | `queryStatusChanged` | When query status changes | `{ queryId: 123, status: 'RESOLVED', changedBy: 'Admin Name' }` |
   | `newQuery` | When a new query is created | `{ queryId: 123, donor: 'john.doe@example.com' }` |
   | `newMessage` | When a new message is added | `{ queryId: 123, messageId: 456, content: '...' }` |
   | `queryTransferred` | When query is transferred | `{ queryId: 123, fromUserId: 456, toUserId: 789 }` |
   | `queryAssigned` | When query is assigned | `{ queryId: 123, userId: 456 }` |
   | `callRequested` | When a call is requested | `{ queryId: 123, requestId: 789, mode: 'VIDEO' }` |
   | `callStarted` | When a call is started | `{ queryId: 123, callSession: { id: 456, roomName: 'room-xyz', mode: 'VIDEO' }, adminId: 789 }` |
   | `callStatusChanged` | When call status changes | `{ queryId: 123, callId: 456, status: 'STARTED' }` |

4. **Client Usage Example**:
   ```javascript
   // Connect to notifications namespace with authentication
   const socket = io('https://your-api-url/notifications', {
     path: '/api/v1/socket.io',
     auth: {
       token: 'your-jwt-token'
     }
   });
   
   // Listen for connection events
   socket.on('connect', () => {
     console.log('Connected to notification system');
     
     // Join a specific query room
     socket.emit('joinQueryRoom', { queryId: 123 }, (response) => {
       console.log('Join response:', response);
     });
   });
   
   // Listen for various notification types
   socket.on('newMessage', (data) => {
     console.log('New message received:', data);
     // Handle new message notification
   });
   
   socket.on('queryStatusChange', (data) => {
     console.log('Query status changed:', data);
     // Update UI based on new status
   });
   
   socket.on('callStarted', (data) => {
     console.log('Call started:', data);
     // Handle call started notification
     // For example: show join call dialog with callSession details
     const { queryId, callSession, adminId } = data;
     showJoinCallDialog(callSession.roomName);
   });
   
   // Clean up when done
   socket.on('disconnect', () => {
     console.log('Disconnected from notification system');
   });
   ```

### Firebase Cloud Messaging (FCM)

For mobile clients, the system implements push notifications using Firebase Cloud Messaging:

1. **FCM Token Management**:
   - Mobile clients register their FCM tokens using the `PUT /users/me/fcm-token` endpoint
   - FCM tokens are stored in the user record and query records

2. **Push Notification Types**:
   The system sends various types of push notifications:
   - Query status changes
   - New messages
   - Call requests and status updates
   - Assignment and transfer notifications

3. **Implementation Details**:
   - Notifications include both visual notification content and data payload
   - Android notifications use high priority and specific channels
   - The payload includes all information needed to navigate to the relevant screen

4. **Example FCM Payload**:
   ```json
   {
     "notification": {
       "title": "New Message",
       "body": "You've received a new message for query #123"
     },
     "data": {
       "type": "new_message",
       "queryId": "123",
       "messageId": "456",
       "timestamp": "2023-10-10T12:00:00.000Z"
     },
     "android": {
       "priority": "high",
       "notification": {
         "channelId": "messages"
       }
     }
   }
   ```

### Integration Points

The notification system is integrated throughout the application:

1. **Donor Queries**:
   - Status changes (resolve, transfer, accept)
   - New query creation
   - Assignment changes

2. **Messaging**:
   - New messages (chat messages, system messages)
   - Message status updates

3. **Calls/Communication**:
   - Call requests
   - Call status changes (started, ended)
   - Call acceptance/rejection

### Benefits

This real-time notification system provides several key benefits:

1. **Immediate Updates**: Users see changes instantly without refreshing or polling
2. **Reduced Server Load**: Eliminates the need for frequent polling
3. **Mobile Awareness**: Push notifications keep mobile users informed even when the app is in the background
4. **Targeted Delivery**: Room-based approach ensures users only receive relevant notifications
5. **Cross-Platform**: Works on web, mobile, and any platform supporting WebSockets or FCM

---

## Public Endpoints

### Authentication

#### POST /auth/login

**Purpose:** Authenticate a user and obtain a JWT token for accessing protected endpoints.

**Request:**
- **Method:** POST
- **URL:** `/auth/login`
- **Body:**
```json
{
  "username": "admin.user",
  "password": "your_password"
}
```

**cURL Example:**
```bash
curl --location --request POST 'http://localhost:3000/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "username": "admin.user",
  "password": "your_password"
}'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "admin.user",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN",
    "avatar": "data:image/jpeg;base64,...",
    "isActive": true
  }
}
```

**Error Response:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Notes:**
- The returned JWT token should be included in the `Authorization` header for all protected endpoints.
- The token expires after a certain period (typically 24 hours).
- The user object contains basic information about the authenticated user.

### Health Checks

#### GET /health

**Purpose:** Check the overall health of the system, including database, storage, and memory.

**Request:**
- **Method:** GET
- **URL:** `/health`

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/health'
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up",
      "responseTime": 5
    },
    "storage": {
      "status": "up",
      "total": 500000000000,
      "used": 100000000000,
      "available": 400000000000
    },
    "memory_heap": {
      "status": "up",
      "total": 4000000000,
      "used": 2000000000,
      "available": 2000000000
    },
    "memory_rss": {
      "status": "up",
      "total": 8000000000,
      "used": 3000000000,
      "available": 5000000000
    }
  }
}
```

**Notes:**
- The `status` field can be "ok" or "error" depending on the health of the system.
- The `info` section provides a summary of each component's status.
- The `details` section provides more detailed information about each component.

#### GET /health/ping

**Purpose:** Simple ping endpoint to check if the API is responsive.

**Request:**
- **Method:** GET
- **URL:** `/health/ping`

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/health/ping'
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-03-20T12:00:00.000Z"
}
```

#### GET /health/advanced

**Purpose:** Get detailed health information about the system, including environment variables and configuration.

**Request:**
- **Method:** GET
- **URL:** `/health/advanced`

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/health/advanced'
```

**Response:**
```json
{
  "status": "ok",
  "environment": "development",
  "version": "1.0.0",
  "uptime": 3600,
  "components": {
    "database": {
      "status": "ok",
      "type": "postgres",
      "version": "14.5"
    },
    "cache": {
      "status": "ok",
      "type": "redis",
      "version": "6.2.6"
    },
    "storage": {
      "status": "ok",
      "type": "local",
      "available": "400GB"
    }
  }
}
```

**Notes:**
- This endpoint provides more detailed information than the basic health check.
- It includes information about the environment, version, and uptime.
- It also provides detailed information about each component of the system.

#### GET /health/advanced/detailed

**Purpose:** Get detailed health information about the system, including environment variables and configuration.

**Request:**
- **Method:** GET
- **URL:** `/health/advanced/detailed`

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/health/advanced/detailed'
```

**Response:**
```json
{
  "status": "ok",
  "environment": "development",
  "version": "1.0.0",
  "uptime": 3600,
  "memory": {
    "rss": "50MB",
    "heapTotal": "25MB",
    "heapUsed": "20MB",
    "external": "5MB"
  },
  "process": {
    "pid": 12345,
    "platform": "darwin",
    "arch": "x64",
    "nodeVersion": "18.12.1",
    "cpuUsage": "2%"
  },
  "database": {
    "status": "ok",
    "type": "postgres",
    "version": "14.5",
    "connections": 5,
    "maxConnections": 20
  },
  "config": {
    "port": 3000,
    "logLevel": "info",
    "environment": "development"
  }
}
```

**Notes:**
- This endpoint provides extremely detailed health information about the system.
- It includes memory usage, process information, database details, and configuration.
- This is typically used for debugging and monitoring purposes.
- Some sensitive information may be redacted in production environments.

### Donor Queries

#### POST /donor-queries

**Purpose:** Create a new support ticket (donor query).

**Request:**

- **Method:** POST
- **URL:** `/donor-queries`
- **Body:** Must follow the `CreateDonorQueryDto` schema.

**Sample Request Body:**

```json
{
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
  "device": "web",
}
```

**cURL Example:**

```bash
curl --location --request POST 'http://localhost:3000/donor-queries' \
--header 'Content-Type: application/json' \
--data-raw '{
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "IN_PROGRESS"
}'
```

**Response:**

Returns the created donor query object as stored in the database.

```json
{
  "id": 123,
  "sid": "session123",
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
  "queryMode": "EMAIL",
  "device": "web",
  "status": "IN_PROGRESS",
  "createdAt": "2023-10-10T12:00:00.000Z",
  "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

#### GET /donor-queries/:id

**Purpose:** Retrieve the details of a single donor query (support ticket).

**Request:**

- **Method:** GET
- **URL:** `/donor-queries/{id}`
- **Parameter:** `id` (number, parsed via `ParseIntPipe`)

**cURL Example:**

```bash
curl --location --request GET 'http://localhost:3000/donor-queries/123'
```

**Response:**

```json
{
  "id": 123,
  "sid": "session123",
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
  "queryMode": "EMAIL",
  "device": "web",
  "status": "IN_PROGRESS",
  "messages": [
    // Array of chat messages ordered by createdAt ascending
  ],
  "createdAt": "2023-10-10T12:00:00.000Z",
  "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

#### GET /donor-queries/user

**Purpose:** Retrieve all donor queries associated with a specific donor. This ties the query to the donorId supplied.

**Request:**

- **Method:** GET
- **URL:** `/donor-queries/user`
- **Query Parameter:** `donorId` (string)

**Sample Request:**

`GET /donor-queries/user?donorId=donor_001`

**cURL Example:**

```bash
curl --location --request GET 'http://localhost:3000/donor-queries/user?donorId=donor_001'
```

**Response:**

```json
[
  {
    "id": 123,
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "IN_PROGRESS",
    "messages": [
      // Array of chat messages
    ],
    "callRequests": [
      // Array of call request objects
    ],
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
  }
  // ... Additional queries if applicable
]
```

#### GET /donor-queries/user/:email

**Purpose:** Retrieve all donor queries associated with a specific donor email. This ties the query to the donor email supplied.

**Request:**

- **Method:** GET
- **URL:** `/donor-queries/user/{email}`
- **Query Parameter:** `email` (string)

**Sample Request:**

`GET /donor-queries/user/john.doe@example.com`

**cURL Example:**

```bash
curl --location --request GET 'http://localhost:3000/donor-queries/user/john.doe@example.com'
```

**Response:**

```json
[
  {
    "id": 123,
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "IN_PROGRESS",
    "messages": [
      // Array of chat messages
    ],
    "callRequests": [
      // Array of call request objects
    ],
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
  }
  // ... Additional queries if applicable
]
```

#### GET /donor-queries/donor/:donorId

**Purpose:** Retrieve all donor queries associated with a specific donor ID. This ties the query to the donor ID supplied.

**Request:**

- **Method:** GET
- **URL:** `/donor-queries/donor/{donorId}`
- **Query Parameter:** `donorId` (string)

**Sample Request:**

`GET /donor-queries/donor/donor_001`

**cURL Example:**

```bash
curl --location --request GET 'http://localhost:3000/donor-queries/donor/donor_001'
```

**Response:**

```json
[
  {
    "id": 123,
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "IN_PROGRESS",
    "messages": [
      // Array of chat messages
    ],
    "callRequests": [
      // Array of call request objects
    ],
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
  }
  // ... Additional queries if applicable
]
```

#### GET /donor-queries/general

**Purpose:** Retrieve donor queries that are in the "IN_PROGRESS" status.

**Request:**

- **Method:** GET
- **URL:** `/donor-queries/general`
- **Query Parameters:**
  - `test` (optional): Filter by test name
  - `stage` (optional): Filter by stage
  - `queryMode` (optional): Filter by query mode (EMAIL, CHAT, etc.)
  - `device` (optional): Filter by device type
  - `date` (optional): Filter by creation date (format: YYYY-MM-DD)

**Sample Request:**

`GET /donor-queries/general?test=integration-test&stage=follow-up&date=2023-10-11`

**cURL Example:**

```bash
curl --location --request GET 'http://localhost:3000/donor-queries/general?test=integration-test&stage=follow-up'
```

**Response:**

```json
{
  "status": 200,
  "data": [
    {
      "id": 124,
      "sid": "session124",
      "donor": "jane.doe@example.com",
      "donorId": "donor_002",
      "test": "integration-test",
      "stage": "follow-up",
      "queryMode": "CHAT",
      "device": "mobile",
      "status": "IN_PROGRESS",
      "messages": [
        // Chat messages
      ],
      "createdAt": "2023-10-11T09:00:00.000Z",
      "updatedAt": "2023-10-11T09:00:00.000Z"
    }
    // ... Additional queries
  ]
}
```

#### POST /donor-queries/:id/donor-close

**Purpose:** Allow donors to close their own queries.

**Request:**

- **Method:** POST
- **URL:** `/donor-queries/{id}/donor-close`
- **Parameter:** `id` (number, parsed via `ParseIntPipe`)
- **Body:**

```json
{
  "donorId": "donor_001"
}

#### GET /donor-queries/transferred

**Purpose:** Retrieve donor queries that are in the "TRANSFERRED" status.

**Request:**
- **Method:** GET
- **URL:** `/donor-queries/transferred`

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/donor-queries/transferred' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
[
    {
        "id": 123,
        "sid": "session123",
        "donor": "john.doe@example.com",
        "donorId": "donor_001",
        "test": "unit-test",
        "stage": "initial",
        "queryMode": "EMAIL",
        "device": "web",
        "status": "TRANSFERRED",
        "messages": [
            // Array of chat messages
        ],
        "callRequests": [
            // Array of call request objects
        ],
        "createdAt": "2023-10-10T12:00:00.000Z",
        "updatedAt": "2023-10-10T12:00:00.000Z"
    }
    // ... Additional queries if applicable
]
```

#### GET /donor-queries/filtered/statuses

**Purpose:** Retrieve donor queries based on multiple statuses.

**Request:**
- **Method:** GET
- **URL:** `/donor-queries/filtered/statuses`
- **Query Parameters:**
  - `statuses`: Comma-separated list of statuses (e.g., "IN_PROGRESS,RESOLVED")

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/donor-queries/filtered/statuses?statuses=IN_PROGRESS,RESOLVED' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
[
    {
        "id": 123,
        "sid": "session123",
        "donor": "john.doe@example.com",
        "donorId": "donor_001",
        "test": "unit-test",
        "stage": "initial",
        "queryMode": "EMAIL",
        "device": "web",
        "status": "IN_PROGRESS",
        "messages": [
            // Array of chat messages
        ],
        "callRequests": [
            // Array of call request objects
        ],
        "createdAt": "2023-10-10T12:00:00.000Z",
        "updatedAt": "2023-10-10T12:00:00.000Z"
    }
    // ... Additional queries if applicable
]
```

#### PATCH /donor-queries/:id

**Purpose:** Update a specific donor query.

**Request:**
- **Method:** PATCH
- **URL:** `/donor-queries/{id}`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**
```json
{
    "sid": "updated_session123",
    "donor": "updated_john.doe@example.com",
    "donorId": "updated_donor_001",
    "test": "updated_unit-test",
    "stage": "updated_initial",
    "queryMode": "updated_EMAIL",
    "device": "updated_web",
    "status": "updated_IN_PROGRESS"
}
```

**cURL Example:**
```bash
curl --location --request PATCH 'http://localhost:3000/donor-queries/123' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "sid": "updated_session123",
    "donor": "updated_john.doe@example.com",
    "donorId": "updated_donor_001",
    "test": "updated_unit-test",
    "stage": "updated_initial",
    "queryMode": "updated_EMAIL",
    "device": "updated_web",
    "status": "updated_IN_PROGRESS"
}'
```

**Response:**
```json
{
    "id": 123,
    "sid": "updated_session123",
    "donor": "updated_john.doe@example.com",
    "donorId": "updated_donor_001",
    "test": "updated_unit-test",
    "stage": "updated_initial",
    "queryMode": "updated_EMAIL",
    "device": "updated_web",
    "status": "updated_IN_PROGRESS",
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

#### POST /donor-queries/:id/pending-reply

**Purpose:** Add a pending reply to a specific donor query. This endpoint is restricted to the admin who is assigned to the query.

**Request:**
- **Method:** POST
- **URL:** `/donor-queries/{id}/pending-reply`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**
```json
{
    "reply": "Pending reply text"
}
```

**cURL Example:**
```bash
curl --location --request POST 'http://localhost:3000/donor-queries/123/pending-reply' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "reply": "Pending reply text"
}'
```

**Response:**
```json
{
    "id": 123,
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "PENDING_REPLY",
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

#### POST /donor-queries/:id/in-progress

**Purpose:** Add a new message to a specific donor query. This endpoint is restricted to the admin who is assigned to the query.

**Request:**
- **Method:** POST
- **URL:** `/donor-queries/{id}/in-progress`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**
```json
{
    "message": "New message text"
}
```

**cURL Example:**
```bash
curl --location --request POST 'http://localhost:3000/donor-queries/123/in-progress' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "message": "New message text"
}'
```

**Response:**
```json
{
    "id": 123,
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "IN_PROGRESS",
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

#### PATCH /donor-queries/:id/resolve

**Purpose:** Resolve a specific donor query.

**Request:**
- **Method:** PATCH
- **URL:** `/donor-queries/{id}/resolve`
- **Headers:** Requires JWT Authentication and Admin Role

**cURL Example:**
```bash
curl --location --request PATCH 'http://localhost:3000/donor-queries/123/resolve' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
    "id": 123,
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "RESOLVED",
    "messages": [
        // Array of chat messages
    ],
    "callRequests": [
        // Array of call request objects
    ],
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

#### PATCH /donor-queries/:id/transfer

**Purpose:** Transfer a specific donor query to another admin.

**Request:**
- **Method:** PATCH
- **URL:** `/donor-queries/{id}/transfer`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**
```json
{
    "adminId": 456
}
```

**cURL Example:**
```bash
curl --location --request PATCH 'http://localhost:3000/donor-queries/123/transfer' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "adminId": 456
}'
```

**Response:**
```json
{
    "id": 123,
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "TRANSFERRED",
    "messages": [
        // Array of chat messages
    ],
    "callRequests": [
        // Array of call request objects
    ],
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

#### POST /donor-queries/:id/send-reminder

**Purpose:** Send a reminder for a specific donor query.

**Request:**
- **Method:** POST
- **URL:** `/donor-queries/{id}/send-reminder`
- **Headers:** Requires JWT Authentication and Admin Role

**cURL Example:**
```bash
curl --location --request POST 'http://localhost:3000/donor-queries/123/send-reminder' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
    "id": 123,
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "IN_PROGRESS",
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

#### DELETE /donor-queries/:id

**Purpose:** Delete a specific donor query.

**Request:**
- **Method:** DELETE
- **URL:** `/donor-queries/{id}`
- **Headers:** Requires JWT Authentication and Admin Role

**cURL Example:**
```bash
curl --location --request DELETE 'http://localhost:3000/donor-queries/123' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
    "status": 200,
    "message": "Donor query with ID 123 deleted successfully"
}
```

#### PATCH /donor-queries/:id/accept

**Purpose:** Accept a specific donor query.

**Request:**
- **Method:** PATCH
- **URL:** `/donor-queries/{id}/accept`
- **Headers:** Requires JWT Authentication and Admin Role

**cURL Example:**
```bash
curl --location --request PATCH 'http://localhost:3000/donor-queries/123/accept' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
    "id": 123,
    "sid": "session123",
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "queryMode": "EMAIL",
    "device": "web",
    "status": "ACCEPTED",
    "messages": [
        // Array of chat messages
    ],
    "callRequests": [
        // Array of call request objects
    ],
    "createdAt": "2023-10-10T12:00:00.000Z",
    "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

### Communication Management

#### DELETE /communication/call/:roomName

**Purpose:** Delete a specific room by its name. This is typically used for cleanup or when a call needs to be forcefully terminated.

**Request:**
- **Method:** DELETE
- **URL:** `/communication/call/{roomName}`
- **Headers:** Requires JWT Authentication and Admin Role

**cURL Example:**
```bash
curl --location --request DELETE 'http://localhost:3000/communication/call/room_xyz' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
    "status": 200,
    "message": "Room room_xyz deleted successfully"
}
```

**Error Response:**
```json
{
    "statusCode": 500,
    "message": "Failed to delete room"
}
```

**Notes:**
- This endpoint deletes the room from the Daily.co API but does not update any call session records in the database
- For proper call termination that updates database records, use the POST /communication/call/:roomName/end endpoint instead
- This endpoint is primarily used for administrative cleanup

---

## Note on Additional Endpoints

The following endpoints are listed in the Table of Contents but may not be fully implemented in the current version of the API:

1. `DELETE /communication/rooms` - For bulk deletion of communication rooms
2. `GET /communication/rooms` - For retrieving a list of all active communication rooms

If you need these functionalities, please check the latest API documentation or contact the development team.

## Database Schema

### Enums

#### QueryStatus
- `IN_PROGRESS`: Query is currently being processed
- `RESOLVED`: Query has been resolved
- `TRANSFERRED`: Query has been transferred to another admin

#### QueryMode
- `TEXT`: Text-based communication
- `HUDDLE`: Huddle-based communication
- `VIDEO_CALL`: Video call communication

#### CallMode
- `VIDEO`: Video call
- `AUDIO`: Audio-only call
- `SCREEN`: Screen sharing

#### CallStatus
- `CREATED`: Call has been created but not started
- `STARTED`: Call is in progress
- `ENDED`: Call has ended

#### CallRequestStatus
- `PENDING`: Call request is pending acceptance
- `ACCEPTED`: Call request has been accepted
- `REJECTED`: Call request has been rejected
- `CANCELLED`: Call request has been cancelled

### Models

#### User
- `id`: Unique identifier (auto-incremented)
- `username`: Unique username
- `password`: Hashed password
- `name`: Full name
- `email`: Email address (optional)
- `role`: User role (ADMIN, SUPER_ADMIN)
- `avatar`: Profile picture (optional)
- `isActive`: Whether the user is active
- `fcmToken`: Firebase Cloud Messaging token for notifications (optional)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### DonorQuery
- `id`: Unique identifier (auto-incremented)
- `sid`: Session ID (unique)
- `donor`: Donor name or email
- `donorId`: Donor ID
- `test`: Test name
- `stage`: Test stage
- `queryMode`: Query mode (TEXT, HUDDLE, VIDEO_CALL)
- `device`: Device information
- `status`: Query status (IN_PROGRESS, RESOLVED, TRANSFERRED)
- `fcmToken`: Firebase Cloud Messaging token for notifications (optional)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `transferredTo`: Name of the admin the query was transferred to (optional)
- `transferredToUserId`: ID of the admin the query was transferred to (optional)
- `resolvedById`: ID of the admin who resolved the query (optional)
- `transferNote`: Note about the transfer (optional)
- `assignedToId`: ID of the admin the query is assigned to (optional)

#### Message
- `id`: Unique identifier (auto-incremented)
- `content`: Message content
- `queryId`: ID of the associated donor query (optional)
- `isFromAdmin`: Whether the message is from an admin
- `senderId`: ID of the sender (optional)
- `recipientId`: ID of the recipient (optional)
- `fcmToken`: Firebase Cloud Messaging token for notifications (optional)
- `callSessionId`: ID of the associated call session (optional)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `messageType`: Message type (QUERY, CHAT, SYSTEM, CALL_STARTED, CALL_ENDED)
- `callMode`: Call mode (VIDEO, AUDIO, SCREEN) (optional)
- `roomName`: Room name for calls (optional)
- `callRequestId`: ID of the associated call request (optional)

#### CallSession
- `id`: Unique identifier (auto-incremented)
- `queryId`: ID of the associated donor query
- `adminId`: ID of the admin who initiated the call
- `roomName`: Daily.co room name (unique)
- `mode`: Call mode (VIDEO, AUDIO, SCREEN)
- `status`: Call status (CREATED, STARTED, ENDED)
- `startedAt`: When the call started (optional)
- `endedAt`: When the call ended (optional)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `adminToken`: Admin token for the call (optional)
- `userToken`: User token for the call (optional)

#### CallRequest
- `id`: Unique identifier (auto-incremented)
- `queryId`: ID of the associated donor query
- `adminId`: ID of the admin who accepted/rejected the request (optional)
- `mode`: Call mode (VIDEO, AUDIO, SCREEN)
- `message`: Optional message about the call request
- `status`: Request status (PENDING, ACCEPTED, REJECTED, CANCELLED)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## Database Migration

To apply database schema changes, run:

```bash
pnpm run db:update-schema
```

This script will:
1. Try to apply migrations using Prisma's standard migration process
2. If that fails, it will fall back to a direct database update using SQL
3. The script handles existing enum types and ensures compatibility with PostgreSQL

Make sure your `.env` file contains a valid `DATABASE_URL` with the correct credentials:

```
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

## Seeding the Database

To seed the database with sample data, run:

```bash
pnpm run db:seed
```

This will create:
- Sample users with different roles
- Sample donor queries with various statuses (IN_PROGRESS, RESOLVED, TRANSFERRED)
- Sample messages and call sessions

## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token generation
- `DAILY_API_KEY`: API key for Daily.co video calls
- `DAILY_DOMAIN`: Domain for Daily.co video calls
- `FCM_SERVER_KEY`: Firebase Cloud Messaging server key for notifications

Optional environment variables:

- `PORT`: Port to run the server on (default: 3000)
- `NODE_ENV`: Environment (development, production, test)
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## Error Handling

All API endpoints follow a consistent error handling pattern:

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

Error responses include:
- `statusCode`: HTTP status code
- `message`: Error message
- `error`: Error type (optional)
- `details`: Additional error details (optional)

Example error response:

```json
{
  "statusCode": 400,
  "message": "Invalid input data",
  "error": "Bad Request",
  "details": {
    "sid": "sid is required"
  }
}
```

### Call System Constraints

#### Prevention of Multiple Active Calls

The system is designed to prevent multiple active calls for the same query at a time. This constraint ensures that:

1. Only one call session (with status `CREATED` or `STARTED`) can exist for a query at any given time
2. When attempting to start a new call or accept a call request for a query that already has an active call, the system:
   - Will not create a new call
   - Will return a specific error response with information about the existing active call
   - Will provide the room URL and details needed to join the existing call

This design decision supports the requirement that "for the call if one call is going on, second person should be able to join only, not able to create it." It ensures that all participants (donors and admins) join the same call session, preventing confusion and fragmentation of the communication.

When an attempt is made to create a second call while one is active, the response will include:
- `success: false` to indicate the operation didn't create a new call
- A message explaining that a call already exists
- Data containing the existing call's details, including the room URL needed to join

This information allows the frontend to redirect users to join the existing call rather than attempting to create a new one.

#### GET /communication/calls/:queryId

**Purpose:** Get all call sessions and related messages for a specific donor query.

**Request:**
- **Method:** GET
- **URL:** `/communication/calls/{queryId}`
- **Auth Required:** Yes
- **Permissions Required:** ADMIN, SUPER_ADMIN

**Response:**
```json
{
  "success": true,
  "message": "Call status updated to STARTED",
  "data": {
    "callSession": {
      "id": 123,
      "queryId": 456,
      "adminId": 789,
      "mode": "VIDEO",
      "status": "CREATED",
      "roomName": "room-abc-xyz",
      "createdAt": "2023-04-15T12:30:45Z"
    },
    "adminToken": "admin_token_for_authentication",
    "userToken": "user_token_for_authentication",
    "roomUrl": "https://domain.daily.co/room-abc-xyz"
  }
}
```

#### POST /communication/call/:queryId

**Purpose:** Start a new call for a specific query. This endpoint is restricted to admins who are assigned to the query.

- **Method:** POST
- **URL:** `/communication/call/{queryId}`
- **Auth Required:** Yes
- **Permissions Required:** ADMIN, SUPER_ADMIN

**Request Body:**
```json
{
  "mode": "VIDEO" // Optional, can be "VIDEO" or "AUDIO", defaults to "VIDEO"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "VIDEO call initiated",
  "data": {
    "callSession": {
      "id": 123,
      "queryId": 456,
      "adminId": 789,
      "mode": "VIDEO",
      "status": "CREATED",
      "roomName": "room-abc-xyz",
      "createdAt": "2023-04-15T12:30:45Z"
    },
    "adminToken": "admin_token_for_authentication",
    "userToken": "user_token_for_authentication",
    "roomUrl": "https://domain.daily.co/room-abc-xyz"
  }
}
```

**Error Responses:**

- **401 Unauthorized** - Not authenticated
- **403 Forbidden** - Not authorized (not an admin)
- **500 Internal Server Error** - Failed to start call (e.g., "There is already an active call for this query. Please end the existing call before starting a new one.")

**Usage Example:**
```bash
curl --location --request POST 'http://localhost:3000/communication/call/123' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "mode": "VIDEO"
}'
```

**Notes:**
- This endpoint creates a new call session and generates tokens for both the admin and user.
- It also sends a WebSocket notification with the `callStarted` event.
- Only one active call (status "CREATED" or "STARTED") can exist for a query at a time.

#### POST /communication/call/:queryId/request

**Purpose:** Request a call session for a specific donor query. This creates a call request record and notifies the assigned admin.