# Proof Concierge Backend - Extended API Documentation

This document provides a detailed guide to all the API endpoints in the Proof Concierge Backend project. For each endpoint, you can find the request method, URL, required/request parameters, a sample request body, an example response, and a cURL example that you can use in Postman.

---

## Table of Contents

- [Overview](#overview)
- [Authentication & Authorization](#authentication--authorization)
- [Real-time Notifications System](#real-time-notifications-system)
  - [WebSocket Notifications](#websocket-notifications)
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
    - [POST /donor-queries/start-call](#post-donor-queriesstart-call)
  - [Messages](#messages)
    - [POST /messages](#post-messages)
    - [GET /messages](#get-messages)
    - [GET /messages/query/:queryId](#get-messagesqueryqueryid)
    - [GET /messages/:queryId](#get-messagesqueryid)
    - [GET /messages/between/:userId1/:userId2](#get-messagesbetweenuserid1userid2)
    - [Enhanced Message Handling System](#enhanced-message-handling-system)
    - [POST /messages/donor/:queryId](#post-messagesdonorqueryid)
  - [Communication](#communication)
    - [GET /communication/calls/:queryId](#get-communicationcallsqueryid)
    - [POST /communication/call/:queryId](#post-communicationcallqueryid)
    - [POST /communication/call/:queryId/request](#post-communicationcallqueryidrequest)
    - [GET /communication/call/:queryId/requests](#get-communicationcallqueryidrequests)
    - [POST /communication/call/:queryId/accept-request](#post-communicationcallqueryidaccept-request)
    - [POST /communication/call/:queryId/accept-request/:requestId](#post-communicationcallqueryidaccept-requestrequestid)
    - [POST /communication/call/:queryId/reject-request/:requestId](#post-communicationcallqueryidreject-requestrequestid)
    - [POST /communication/call/:queryId/direct-call](#post-communicationcallqueryiddirect-call)
    - [GET /communication/call/:queryId/active-call](#get-communicationcallqueryidactive-call)
    - [POST /communication/call/:roomName/donor-end](#post-communicationcallroomnamedonor-end)
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
      - [POST /messages/donor/:queryId](#post-messagesdonorqueryid)
      - [POST /messages/system/:queryId](#post-messagessystemqueryid)
      - [GET /messages/donor/:donorId](#get-messagesdonordonorid)
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

   | Event                | Description                                     | Payload Example                                                                                                      |
   | -------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
   | `queryStatusChanged` | When query status changes                       | `{ queryId: 123, status: 'RESOLVED', changedBy: 'Admin Name' }`                                                      |
   | `newQuery`           | When a new query is created                     | `{ queryId: 123, donor: 'john.doe@example.com' }`                                                                    |
   | `newMessage`         | When a new message is added (legacy format)     | `{ queryId: 123, messageId: 456, content: '...' }`                                                                   |
   | `enhancedMessage`    | When a new message is added with sender details | `{ id: 456, content: '...', queryId: 123, senderType: 'DONOR', sender: { donorId: 'donor_001', name: 'John Doe' } }` |
   | `queryTransferred`   | When query is transferred                       | `{ queryId: 123, fromUserId: 456, toUserId: 789 }`                                                                   |
   | `queryAssigned`      | When query is assigned                          | `{ queryId: 123, userId: 456 }`                                                                                      |
   | `callRequested`      | When a call is requested                        | `{ queryId: 123, requestId: 789 }`                                                                                   |
   | `callStarted`        | When a call is started                          | `{ queryId: 123, callSession: { id: 456, roomName: 'room-xyz' }, adminId: 789 }`                                     |
   | `callStatusChanged`  | When call status changes                        | `{ queryId: 123, callId: 456, status: 'STARTED' }`                                                                   |

4. **Client Usage Example**:

   ```javascript
   // Connect to notifications namespace with authentication
   const socket = io('https://your-api-url/notifications', {
     path: '/api/v1/socket.io',
     auth: {
       token: 'your-jwt-token',
     },
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
     console.log('New message received (legacy format):', data);
     // Handle new message notification
   });

   socket.on('enhancedMessage', (data) => {
     console.log('Enhanced message received:', data);
     // Handle enhanced message with sender details
     const { senderType, sender } = data;

     // Display different UI elements based on sender type
     if (senderType === 'ADMIN') {
       // Show admin avatar and name
       showAdminMessage(sender.name, data.content, sender.avatar);
     } else if (senderType === 'DONOR') {
       // Show donor message with donor name
       showDonorMessage(sender.name, data.content);
     } else {
       // Show system message
       showSystemMessage(data.content);
     }
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
- **Body:**

```json
{
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
  "device": "web",
  "content": "I need help with my donation"
}
```

**cURL Example:**

```bash
curl --location --request POST 'http://localhost:3000/donor-queries' \
--header 'Content-Type: application/json' \
--data-raw '{
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
    "device": "web",
    "content": "I need help with my donation",
    "status": "IN_PROGRESS"
}'
```

**Response:**

Returns the created donor query object as stored in the database.

```json
{
  "id": 123,
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
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
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
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
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
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
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
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
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
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
      "donor": "jane.doe@example.com",
      "donorId": "donor_002",
      "test": "integration-test",
      "stage": "follow-up",
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
```

#### POST /donor-queries/start-call

**Purpose:** Create a new donor query and immediately start a direct call, returning both the query details and call joining information.

**Request:**

- **Method:** POST
- **URL:** `/donor-queries/start-call`
- **Auth Required:** No (Public endpoint)
- **Body:**

```json
{
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
  "device": "web",
  "content": "I need help with my donation and want to start a call immediately",
  "callType": "video" // Optional, can be "video" or "audio", defaults to "video" if not specified
}
```

**cURL Example:**

```bash
curl --location --request POST 'http://localhost:3000/donor-queries/start-call' \
--header 'Content-Type: application/json' \
--data-raw '{
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
  "device": "web",
  "content": "I need help with my donation and want to start a call immediately",
  "callType": "audio"
}'
```

**Response:**

```json
{
  "status": 201,
  "data": {
    "query": {
      "id": 123,
      "donor": "john.doe@example.com",
      "donorId": "donor_001",
      "test": "unit-test",
      "stage": "initial",
      "device": "web",
      "status": "IN_PROGRESS",
      "createdAt": "2023-10-10T12:00:00.000Z",
      "updatedAt": "2023-10-10T12:00:00.000Z"
    },
    "call": {
      "callSession": {
        "id": 456,
        "queryId": 123,
        "adminId": null,
        "roomName": "room-abc-xyz",
        "status": "CREATED",
        "userToken": "user_token_for_authentication",
        "adminToken": "admin_token_for_authentication",
        "callType": "video",
        "createdAt": "2023-10-10T12:00:01.000Z"
      },
      "room": {
        "name": "room-abc-xyz"
      },
      "tokens": {
        "admin": "admin_token_for_authentication",
        "user": "user_token_for_authentication"
      },
      "roomUrl": "https://domain.daily.co/room-abc-xyz",
      "callType": "video"
    }
  }
}
```

**Notes:**

- This endpoint creates a new query and immediately starts a call in one step
- The `callType` parameter allows specifying whether to start a video call or an audio-only call
- It returns both the query details and all the information needed to join the call
- The donor can use the `userToken` and `roomUrl` to join the call directly
- If there is an admin assigned to the query, they will receive a notification about the call
- The call can be joined even if no admin has been assigned yet

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
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
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
    "donor": "john.doe@example.com",
    "donorId": "donor_001",
    "test": "unit-test",
    "stage": "initial",
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
  "donor": "updated_john.doe@example.com",
  "donorId": "updated_donor_001",
  "test": "updated_unit-test",
  "stage": "updated_initial",
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
    "donor": "updated_john.doe@example.com",
    "donorId": "updated_donor_001",
    "test": "updated_unit-test",
    "stage": "updated_initial",
    "device": "updated_web",
    "status": "updated_IN_PROGRESS"
}'
```

**Response:**

```json
{
  "id": 123,
  "donor": "updated_john.doe@example.com",
  "donorId": "updated_donor_001",
  "test": "updated_unit-test",
  "stage": "updated_initial",
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
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
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
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
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
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
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
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
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
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
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
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
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

### Messages

The Proof Concierge Backend implements an enhanced message handling system that clearly identifies message sources and properly tracks donor information.

#### Enhanced Message Handling System

#### POST /messages/donor/:queryId

**Purpose:** Create a message from a donor with explicit donor information.

**Request:**

- **Method:** POST
- **URL:** `/messages/donor/{queryId}`
- **Body:**

```json
{
  "content": "This is a message from a donor",
  "donorId": "donor_001",
  "messageType": "QUERY"
}
```

**cURL Example:**

```bash
curl --location --request POST 'http://localhost:3000/messages/donor/123' \
--header 'Content-Type: application/json' \
--data-raw '{
  "content": "This is a message from a donor",
  "donorId": "donor_001",
  "messageType": "QUERY"
}'
```

**Response:**

```json
{
  "status": 201,
  "data": {
    "id": 790,
    "content": "This is a message from a donor",
    "queryId": 123,
    "donorId": "donor_001",
    "senderType": "DONOR",
    "isFromAdmin": false,
    "messageType": "QUERY",
    "createdAt": "2023-10-15T12:35:56.789Z",
    "updatedAt": "2023-10-15T12:35:56.789Z"
  }
}
```

### Communication

The Proof Concierge Backend provides a comprehensive API for handling call sessions between admins and donors. This includes starting and ending calls, managing call requests, and handling direct calls initiated by donors.

#### Key Features:

- Support for both video and audio calls
- Call request system with acceptance/rejection
- Direct call initiation by donors
- Call status tracking
- Real-time notifications for call events
- Automatic room cleanup for completed/expired calls

#### Call Types

The system supports two types of calls:

- **Video Calls** (`callType: "video"`): Default option with both audio and video capabilities
- **Audio Calls** (`callType: "audio"`): Audio-only calls for situations with limited bandwidth or where video is not needed

#### POST /communication/call/:queryId

**Purpose:** Start a call session between an admin and a donor for a specific query. This endpoint is restricted to users with ADMIN or SUPER_ADMIN roles.

**Request:**

- **Method:** POST
- **URL:** `/communication/call/{queryId}`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**

```json
{
  "callType": "video" // Optional, can be "video" or "audio", defaults to "video" if not specified
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Video call initiated", // or "Audio call initiated" for audio calls
  "data": {
    "callSession": {
      "id": 123,
      "queryId": 456,
      "adminId": 789,
      "status": "CREATED",
      "roomName": "room-abc-xyz",
      "userToken": "user_token_for_authentication",
      "adminToken": "admin_token_for_authentication",
      "callType": "video", // or "audio" for audio-only calls
      "createdAt": "2023-04-15T12:30:45Z"
    },
    "adminToken": "admin_token_for_authentication",
    "userToken": "user_token_for_authentication",
    "roomUrl": "https://domain.daily.co/room-abc-xyz",
    "callType": "video" // The type of call that was created
  }
}
```

**Usage Example:**

```bash
curl --location --request POST 'http://localhost:3000/communication/call/123' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "callType": "audio"
}'
```

**Notes:**

- This endpoint creates a new call session with Daily.co and generates tokens for both the admin and the donor.
- The `callType` parameter allows specifying whether to start a video call or an audio-only call.
- A message is created to record the call activity in the chat history.
- WebSocket events are emitted with the `callStarted` event.
- If FCM tokens are available, push notifications are sent to the donor's device.

#### POST /communication/call/:queryId/request

**Purpose:** Create a call request from a donor, which admins can then accept or reject. This endpoint is public and allows donors to request calls.

**Request:**

- **Method:** POST
- **URL:** `/communication/call/{queryId}/request`
- **Auth Required:** No (Public endpoint)
- **Body:**

```json
{
  "message": "I would like to discuss my test results" // Optional message from the donor
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Call request created successfully",
  "data": {
    "callRequest": {
      "id": 123,
      "queryId": 456,
      "status": "PENDING",
      "adminId": null,
      "message": "I would like to discuss my test results",
      "createdAt": "2023-04-15T12:30:45Z"
    },
    "message": {
      "id": 789,
      "queryId": 456,
      "senderId": null,
      "content": "Donor requested a call: I would like to discuss my test results",
      "messageType": "SYSTEM",
      "callRequestId": 123,
      "createdAt": "2023-04-15T12:30:45Z"
    }
  }
}
```

**Notes:**

- This endpoint creates a call request record that admins can see and respond to.
- A system message is created in the chat to record the request.
- Notifications are sent to the assigned admin if applicable.

#### POST /communication/call/:queryId/accept-request

**Purpose:** Accept a call request and start a call session. This endpoint is restricted to users with ADMIN or SUPER_ADMIN roles.

**Request:**

- **Method:** POST
- **URL:** `/communication/call/{queryId}/accept-request`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**

```json
{
  "callType": "video" // Optional, can be "video" or "audio", defaults to "video" if not specified
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Call request accepted and video call initiated", // or "... audio call initiated"
  "data": {
    "callSession": {
      "id": 123,
      "queryId": 456,
      "adminId": 789,
      "status": "CREATED",
      "roomName": "room-abc-xyz",
      "userToken": "user_token_for_authentication",
      "adminToken": "admin_token_for_authentication",
      "callType": "video", // or "audio" for audio-only calls
      "createdAt": "2023-04-15T12:30:45Z"
    },
    "callRequest": {
      "id": 123,
      "queryId": 456,
      "status": "ACCEPTED",
      "adminId": 789,
      "message": "Donor requested a call",
      "createdAt": "2023-04-15T12:30:45Z"
    },
    "tokens": {
      "admin": "admin_token_for_authentication",
      "user": "user_token_for_authentication"
    },
    "roomUrl": "https://domain.daily.co/room-abc-xyz",
    "callType": "video" // The type of call that was created
  }
}
```

**Error Responses:**

- **404 Not Found** - Call request not found
- **400 Bad Request** - Call request already accepted or rejected
- **500 Internal Server Error** - Failed to accept call request

**Usage Example:**

```bash
curl --location --request POST 'http://localhost:3000/communication/call/123/accept-request' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "callType": "audio"
}'
```

**Notes:**

- This endpoint accepts the most recent call request for the specified query and starts a call session.
- The `callType` parameter allows specifying whether to start a video call or an audio-only call.
- It sends a WebSocket notification to the donor that their call request has been accepted.
- It also sends FCM notifications if available.

#### POST /communication/call/:queryId/direct-call

**Purpose:** Start a direct call for a specific donor query without requiring an admin to accept a request first. This endpoint is public and allows donors to initiate calls directly.

**Request:**

- **Method:** POST
- **URL:** `/communication/call/{queryId}/direct-call`
- **Auth Required:** No (Public endpoint)
- **Body:**

```json
{
  "callType": "video" // Optional, can be "video" or "audio", defaults to "video" if not specified
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Video call started successfully", // or "Audio call started successfully"
  "data": {
    "callSession": {
      "id": 123,
      "queryId": 456,
      "adminId": 789,
      "status": "CREATED",
      "roomName": "room-abc-xyz",
      "userToken": "user_token_for_authentication",
      "adminToken": "admin_token_for_authentication",
      "callType": "video", // or "audio" for audio-only calls
      "createdAt": "2023-04-15T12:30:45Z"
    },
    "room": {
      "name": "room-abc-xyz"
    },
    "tokens": {
      "admin": "admin_token_for_authentication",
      "user": "user_token_for_authentication"
    },
    "notificationData": {
      "fcmToken": "fcm-token-for-notifications",
      "adminName": "Admin Name"
    }
  }
}
```

**Error Responses:**

- **404 Not Found** - Query not found
- **400 Bad Request** - No admin assigned to the query
- **500 Internal Server Error** - Failed to start call

**Usage Example:**

```bash
curl --location --request POST 'http://localhost:3000/communication/call/123/direct-call' \
--header 'Content-Type: application/json' \
--data-raw '{
  "callType": "audio"
}'
```

**Notes:**

- This endpoint creates a new call session and generates tokens for both the admin and the donor.
- The `callType` parameter allows specifying whether to start a video call or an audio-only call.
- If a call is already active for the query, it returns the existing call details instead of creating a new one.
- It sends notifications (WebSocket, FCM, and email) to the assigned admin.
- WebSocket events are emitted with the `directCallStarted` event.

#### GET /communication/call/:queryId/active-call

**Purpose:** Get details of an active call for a specific donor query. This endpoint allows donors to check if there's an ongoing call they can join.

**Request:**

- **Method:** GET
- **URL:** `/communication/call/{queryId}/active-call`
- **Auth Required:** No (Public endpoint)

**Success Response:**

```json
{
  "success": true,
  "message": "Active call found",
  "data": {
    "callSession": {
      "id": 123,
      "queryId": 456,
      "adminId": 789,
      "status": "CREATED",
      "roomName": "room-abc-xyz",
      "userToken": "user_token_for_authentication",
      "adminToken": "admin_token_for_authentication",
      "callType": "video", // The type of call (video or audio)
      "createdAt": "2023-04-15T12:30:45Z"
    },
    "roomUrl": "https://domain.daily.co/room-abc-xyz",
    "userToken": "user_token_for_authentication",
    "callType": "video" // The type of call (video or audio)
  }
}
```

**Response (No Active Call):**

```json
{
  "success": false,
  "message": "No active call found for this query",
  "data": null
}
```

**Error Responses:**

- **500 Internal Server Error** - Failed to get active call

**Usage Example:**

```bash
curl --location --request GET 'http://localhost:3000/communication/call/123/active-call'
```

**Notes:**

- This endpoint returns details of any active call (status "CREATED" or "STARTED") for the specified query.
- If multiple active calls exist (which should not happen), it returns the most recent one.
- The response includes the room URL, user token, and call type needed to join the call.

### Messages

The Proof Concierge Backend implements an enhanced message handling system that clearly identifies message sources and properly tracks donor information.

#### Message Sender Types

Messages can come from three different sources, defined by the `SenderType` enum:

- `ADMIN`: Messages sent by support staff/admins
- `DONOR`: Messages sent by donors submitting queries
- `SYSTEM`: Automated system messages (e.g., notifications about call status changes)

#### Messages Management

##### POST /messages/admin/:queryId

**Purpose:** Create a message from an admin for a specific donor query. This endpoint is restricted to users with ADMIN or SUPER_ADMIN roles.

**Request:**

- **Method:** POST
- **URL:** `/messages/admin/{queryId}`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**

```json
{
  "content": "This is a response from an admin",
  "messageType": "QUERY"
}
```

**cURL Example:**

```bash
curl --location --request POST 'http://localhost:3000/messages/admin/123' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "content": "This is a response from an admin",
  "messageType": "QUERY"
}'
```

**Response:**

```json
{
  "status": 201,
  "data": {
    "id": 791,
    "content": "This is a response from an admin",
    "queryId": 123,
    "senderId": 456,
    "senderType": "ADMIN",
    "isFromAdmin": true,
    "messageType": "QUERY",
    "createdAt": "2023-10-15T12:36:56.789Z",
    "updatedAt": "2023-10-15T12:36:56.789Z"
  }
}
```

##### GET /messages/admin/:queryId

**Purpose:** Retrieve all messages for a specific donor query. This endpoint is restricted to the admin who is assigned to the query.

**Request:**

- **Method:** GET
- **URL:** `/messages/admin/{queryId}`
- **Headers:** Requires JWT Authentication and Admin Role
- **Query Parameters:**
  - `limit` (optional): Number of messages to retrieve
  - `offset` (optional): Pagination offset

**cURL Example:**

```bash
curl --location --request GET 'http://localhost:3000/messages/admin/123?limit=10&offset=0' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**

```json
{
  "status": 200,
  "data": {
    "messages": [
      {
        "id": 791,
        "content": "This is a response from an admin",
        "queryId": 123,
        "senderId": 456,
        "senderType": "ADMIN",
        "isFromAdmin": true,
        "messageType": "QUERY",
        "createdAt": "2023-10-15T12:36:56.789Z",
        "updatedAt": "2023-10-15T12:36:56.789Z",
        "sender": {
          "id": 456,
          "name": "Admin User",
          "username": "admin.user",
          "avatar": "https://example.com/avatar.jpg",
          "role": "ADMIN",
          "isActive": true
        }
      },
      {
        "id": 790,
        "content": "This is a message from a donor",
        "queryId": 123,
        "donorId": "donor_001",
        "donorName": "John Doe",
        "senderType": "DONOR",
        "isFromAdmin": false,
        "messageType": "QUERY",
        "createdAt": "2023-10-15T12:35:56.789Z",
        "updatedAt": "2023-10-15T12:35:56.789Z"
      }
      // ... more messages
    ],
    "total": 2,
    "limit": 10,
    "offset": 0
  }
}
```

##### POST /messages/system/:queryId

**Purpose:** Create a system message not associated with any specific user. This endpoint is restricted to users with ADMIN or SUPER_ADMIN roles.

**Request:**

- **Method:** POST
- **URL:** `/messages/system/{queryId}`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**

```json
{
  "content": "This is a system notification message",
  "messageType": "SYSTEM"
}
```

**cURL Example:**

```bash
curl --location --request POST 'http://localhost:3000/messages/system/123' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "content": "This is a system notification message",
  "messageType": "SYSTEM"
}'
```

**Response:**

```json
{
  "status": 201,
  "data": {
    "id": 792,
    "content": "This is a system notification message",
    "queryId": 123,
    "senderType": "SYSTEM",
    "isFromAdmin": true,
    "messageType": "SYSTEM",
    "createdAt": "2023-10-15T12:37:56.789Z",
    "updatedAt": "2023-10-15T12:37:56.789Z"
  }
}
```

##### GET /messages/donor/:donorId

**Purpose:** Get all messages from a specific donor across all queries. This endpoint is restricted to users with ADMIN or SUPER_ADMIN roles.

**Request:**

- **Method:** GET
- **URL:** `/messages/donor/{donorId}`
- **Headers:** Requires JWT Authentication and Admin Role

**cURL Example:**

```bash
curl --location --request GET 'http://localhost:3000/messages/donor/donor_001' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**

```json
{
  "status": 200,
  "data": [
    {
      "id": 790,
      "content": "This is a message from a donor",
      "queryId": 123,
      "donorId": "donor_001",
      "donorName": "John Doe",
      "senderType": "DONOR",
      "isFromAdmin": false,
      "messageType": "QUERY",
      "createdAt": "2023-10-15T12:35:56.789Z",
      "updatedAt": "2023-10-15T12:35:56.789Z",
      "query": {
        "id": 123,
        "donor": "John Doe",
        "status": "IN_PROGRESS",
        "test": "unit-test",
        "stage": "initial"
      }
    }
    // More messages from this donor
  ]
}
```

#### PUT /users/me/password

**Purpose:** Change the password for the currently authenticated user.

**Request:**

- **Method:** PUT
- **URL:** `/users/me/password`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**

```json
{
  "currentPassword": "your_current_password",
  "newPassword": "your_new_password"
}
```

**cURL Example:**

```bash
curl --location --request PUT 'http://localhost:3000/users/me/password' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "currentPassword": "your_current_password",
  "newPassword": "your_new_password"
}'
```

**Response:**

```json
{
  "id": 123,
  "username": "admin.user",
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "ADMIN",
  "avatar": "data:image/jpeg;base64,...",
  "isActive": true,
  "createdAt": "2023-10-10T12:00:00.000Z",
  "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

**Error Responses:**

- **401 Unauthorized** - Current password is incorrect
- **400 Bad Request** - New password must be different from the current password
- **400 Bad Request** - New password must be at least 8 characters long

**Notes:**

- The endpoint requires the current password to be provided for security verification.
- The new password must be at least 8 characters long.
- The new password must be different from the current password.
- The response includes the updated user object with the password field omitted for security.

#### POST /users/me/avatar

**Purpose:** Upload a new avatar image for the currently authenticated user.

**Request:**

- **Method:** POST
- **URL:** `/users/me/avatar`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**

```json
{
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
}
```

**cURL Example:**

```bash
curl --location --request POST 'http://localhost:3000/users/me/avatar' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
}'
```

**Response:**

```json
{
  "id": 123,
  "username": "admin.user",
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "ADMIN",
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
  "isActive": true,
  "createdAt": "2023-10-10T12:00:00.000Z",
  "updatedAt": "2023-10-10T12:00:00.000Z"
}
```

**Error Responses:**

- **400 Bad Request** - No image provided
- **400 Bad Request** - Invalid image format. Must be a valid base64 encoded JPEG, PNG, or GIF
- **400 Bad Request** - Image size exceeds the limit of 4MB

**Notes:**

- The avatar must be provided as a base64-encoded image string.
- Supported image formats are JPEG, PNG, and GIF.
- The maximum file size is 4MB.
- The base64 string should include the data URI prefix (e.g., `data:image/jpeg;base64,`).
- The response includes the updated user object with the new avatar.
