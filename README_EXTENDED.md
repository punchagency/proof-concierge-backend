# Proof Concierge Backend - Extended API Documentation

This document provides a detailed guide to all the API endpoints in the Proof Concierge Backend project. For each endpoint, you can find the request method, URL, required/request parameters, a sample request body, an example response, and a cURL example that you can use in Postman.

---

## Table of Contents

- [Overview](#overview)
- [Authentication & Authorization](#authentication--authorization)
- [Public Endpoints](#public-endpoints)
  - [Authentication](#authentication)
    - [POST /auth/login](#post-authlogin)
  - [Health Checks](#health-checks)
    - [GET /health](#get-health)
    - [GET /health/ping](#get-healthping)
    - [GET /health/advanced](#get-healthadvanced)
  - [Donor Queries](#donor-queries)
    - [POST /donor-queries](#post-donor-queries)
    - [GET /donor-queries/:id](#get-donor-queriesid)
    - [GET /donor-queries/user](#get-donor-queriesuser)
    - [GET /donor-queries/general](#get-donor-queriesgeneral)
  - [Messages](#messages)
    - [POST /messages](#post-messages)
    - [GET /messages](#get-messages)
    - [GET /messages/query/:queryId](#get-messagesqueryqueryid)
    - [GET /messages/:queryId](#get-messagesqueryid)
    - [GET /messages/between/:userId1/:userId2](#get-messagesbetweenuserid1userid2)
  - [Communication](#communication)
    - [POST /communication/call/:queryId](#post-communicationcallqueryid)
    - [POST /communication/call/:roomName/end](#post-communicationcallroomnameend)
    - [PUT /communication/call/:roomName/status](#put-communicationcallroomnamestatus)
    - [GET /communication/calls/:queryId](#get-communicationcallsqueryid)
    - [POST /communication/call/:queryId/request](#post-communicationcallqueryidrequest)
    - [POST /communication/call/:queryId/accept-request](#post-communicationcallqueryidaccept-request)
- [Protected Endpoints (Admin/Support Staff)](#protected-endpoints-adminsupport-staff)
  - [User Management](#user-management)
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
    - [PATCH /donor-queries/:id](#patch-donor-queriesid)
    - [PATCH /donor-queries/:id/resolve](#patch-donor-queriesidresolve)
    - [PATCH /donor-queries/:id/transfer](#patch-donor-queriesidtransfer)
    - [POST /donor-queries/:id/send-reminder](#post-donor-queriesidsend-reminder)
    - [DELETE /donor-queries/:id](#delete-donor-queriesid)
    - [PATCH /donor-queries/:id/accept](#patch-donor-queriesidaccept)
  - [Communication Management](#communication-management)
    - [DELETE /communication/call/:roomName](#delete-communicationcallroomname)
    - [DELETE /communication/rooms](#delete-communicationrooms)
    - [GET /communication/rooms](#get-communicationrooms)

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
  "sid": "session123",
  "donor": "john.doe@example.com",
  "donorId": "donor_001",
  "test": "unit-test",
  "stage": "initial",
  "queryMode": "EMAIL",
  "device": "web",
  "status": "PENDING_REPLY"
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
    "status": "PENDING_REPLY"
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
  "status": "PENDING_REPLY",
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
  "status": "PENDING_REPLY",
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
    "status": "PENDING_REPLY",
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

**Purpose:** Retrieve donor queries that are in the "IN_PROGRESS" or "PENDING_REPLY" statuses.

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

### Messages

#### POST /messages

**Purpose:** Send a message with support for various message types (QUERY, CHAT, SYSTEM, CALL_STARTED, CALL_ENDED).

**Request:**
- **Method:** POST
- **URL:** `/messages`
- **Body:**
```json
{
    "content": "Your message here",
    "queryId": 123,
    "senderId": 456,
    "recipientId": 789,
    "messageType": "QUERY",
    "fcmToken": "optional_fcm_token_for_notifications"
}
```

**Response:**
```json
{
    "id": 1,
    "content": "Your message here",
    "queryId": 123,
    "senderId": 456,
    "recipientId": 789,
    "messageType": "QUERY",
    "createdAt": "2024-03-20T12:00:00.000Z",
    "sender": {
        // Sender details
    },
    "recipient": {
        // Recipient details
    },
    "query": {
        // Query details if applicable
    }
}
```

#### GET /messages

**Purpose:** Retrieve messages based on various filters.

**Request:**
- **Method:** GET
- **URL:** `/messages`
- **Query Parameters:**
  - `queryId` (optional)
  - `senderId` (optional)
  - `recipientId` (optional)
  - `messageType` (optional, can be array)
  - `limit` (optional, default: 50)
  - `offset` (optional, default: 0)

**Response:**
```json
[
    {
        "id": 1,
        "content": "Message content",
        "queryId": 123,
        "senderId": 456,
        "recipientId": 789,
        "messageType": "QUERY",
        "createdAt": "2024-03-20T12:00:00.000Z",
        "sender": {
            // Sender details
        },
        "recipient": {
            // Recipient details
        },
        "query": {
            // Query details if applicable
        }
    }
    // ... more messages
]
```

#### GET /messages/query/:queryId

**Purpose:** Retrieve all messages for a specific donor query.

**Request:**
- **Method:** GET
- **URL:** `/messages/query/{queryId}`
- **Parameter:** `queryId` (number)
- **Query Parameters:**
  - `limit` (optional, default: 50)
  - `offset` (optional, default: 0)

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/messages/query/123'
```

**Response:**
```json
{
    "status": 200,
    "data": [
        {
            "id": 1,
            "content": "Message content",
            "queryId": 123,
            "senderId": 456,
            "recipientId": 789,
            "messageType": "CHAT",
            "createdAt": "2024-03-20T12:00:00.000Z",
            "sender": {
                // Sender details
            },
            "recipient": {
                // Recipient details
            }
        },
        {
            "id": 2,
            "content": "Call started by admin. Mode: VIDEO",
            "queryId": 123,
            "senderId": 456,
            "messageType": "CALL_STARTED",
            "callMode": "VIDEO",
            "roomName": "room_xyz",
            "callSessionId": 1,
            "createdAt": "2024-03-20T12:05:00.000Z",
            "callSession": {
                "id": 1,
                "mode": "VIDEO",
                "status": "CREATED",
                "roomName": "room_xyz",
                "userToken": "user_token_here",
                "startedAt": null,
                "endedAt": null
            },
            "sender": {
                // Admin details
            }
        }
        // ... more messages for this query
    ]
}
```

**Notes:**
- For call-related messages (with `messageType` of "CALL_STARTED"), the response includes a `callSession` object with all the details needed to join the call.
- Users can use the `callSession.userToken` to authenticate and join the call.
- The `callSession.roomName` can be used to construct the room URL: `https://{domain}.daily.co/{roomName}`
- The `callSession.status` indicates if the call is active ("CREATED", "STARTED") or has ended ("ENDED").

#### GET /messages/:queryId

**Purpose:** Retrieve all messages for a specific donor query.

**Request:**
- **Method:** GET
- **URL:** `/messages/{queryId}`
- **Parameter:** `queryId` (number)
- **Query Parameters:**
  - `limit` (optional, default: 50)
  - `offset` (optional, default: 0)

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/messages/123'
```

**Response:**
```json
{
    "data": [
        {
            "id": 1,
            "content": "Message content",
            "queryId": 123,
            "senderId": 456,
            "recipientId": 789,
            "messageType": "CHAT",
            "createdAt": "2024-03-20T12:00:00.000Z",
            "sender": {
                // Sender details
            },
            "recipient": {
                // Recipient details
            }
        },
        {
            "id": 2,
            "content": "Call started by admin. Mode: VIDEO",
            "queryId": 123,
            "senderId": 456,
            "messageType": "CALL_STARTED",
            "callMode": "VIDEO",
            "roomName": "room_xyz",
            "callSessionId": 1,
            "createdAt": "2024-03-20T12:05:00.000Z",
            "callSession": {
                "id": 1,
                "mode": "VIDEO",
                "status": "CREATED",
                "roomName": "room_xyz",
                "userToken": "user_token_here",
                "startedAt": null,
                "endedAt": null
            },
            "sender": {
                // Admin details
            }
        }
        // ... more messages for this query
    ],
    "total": 10,
    "limit": 50,
    "offset": 0
}
```

**Notes:**
- For call-related messages (with `messageType` of "CALL_STARTED"), the response includes a `callSession` object with all the details needed to join the call.
- Users can use the `callSession.userToken` to authenticate and join the call.
- The `callSession.roomName` can be used to construct the room URL: `https://{domain}.daily.co/{roomName}`
- The `callSession.status` indicates if the call is active ("CREATED", "STARTED") or has ended ("ENDED").

#### GET /messages/between/:userId1/:userId2

**Purpose:** Retrieve all direct messages exchanged between two users.

**Request:**
- **Method:** GET
- **URL:** `/messages/between/{userId1}/{userId2}`
- **Parameters:**
  - `userId1` (number): ID of the first user
  - `userId2` (number): ID of the second user
- **Query Parameters:**
  - `limit` (optional, default: 50)
  - `offset` (optional, default: 0)

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/messages/between/456/789'
```

**Response:**
```json
{
    "data": [
        {
            "id": 1,
            "content": "Direct message content",
            "senderId": 456,
            "recipientId": 789,
            "messageType": "CHAT",
            "createdAt": "2024-03-20T12:00:00.000Z",
            "sender": {
                // Sender details
            },
            "recipient": {
                // Recipient details
            }
        }
        // ... more messages between these users
    ],
    "total": 5,
    "limit": 50,
    "offset": 0
}
```

### Communication

#### POST /communication/call/:queryId

**Purpose:** Start a new call session for a specific donor query.

**Request:**
- **Method:** POST
- **URL:** `/communication/call/{queryId}`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**
```json
{
    "mode": "VIDEO" // or "AUDIO" or "SCREEN"
}
```

**Response:**
```json
{
    "success": true,
    "message": "VIDEO call initiated",
    "data": {
        "callSession": {
            "id": 1,
            "queryId": 123,
            "adminId": 456,
            "roomName": "room_xyz",
            "mode": "VIDEO",
            "status": "CREATED",
            "userToken": "user_token_here",
            "adminToken": "admin_token_here",
            "createdAt": "2024-03-20T12:00:00.000Z"
        },
        "adminToken": "admin_token_here",
        "userToken": "user_token_here",
        "roomUrl": "https://your-domain.daily.co/room_xyz"
    }
}
```

**How Users Join Calls:**
1. When an admin starts a call, a message with `messageType: "CALL_STARTED"` is created and stored in the database.
2. The user can retrieve this message through the `/messages/{queryId}` endpoint.
3. The message includes a `callSession` object with all the details needed to join the call:
   - `roomName`: Used to construct the room URL (`https://{domain}.daily.co/{roomName}`)
   - `userToken`: Used to authenticate the user when joining the call
   - `mode`: Indicates if it's a video or audio call
   - `status`: Indicates if the call is active or has ended
4. The user can then use this information to join the call without needing to make additional API requests.

**Error Responses:**
```json
{
    "statusCode": 500,
    "message": "Donor query with ID 999 not found"
}
```
```json
{
    "statusCode": 400,
    "message": "Admin ID is required"
}
```

```json
{
    "statusCode": 500,
    "message": "Admin with ID 456 not found"
}
```

```json
{
    "statusCode": 500,
    "message": "Daily.co API not initialized"
}
```

**Notes:**
- The `mode` parameter must be one of the valid CallMode enum values: "VIDEO", "AUDIO", or "SCREEN"
- If an invalid mode is provided, it will default to "VIDEO"
- The admin ID is required and must be a valid user ID
- The admin must be authenticated with a valid JWT token
- The admin must have the ADMIN or SUPER_ADMIN role

#### POST /communication/call/:roomName/end

**Purpose:** End an active call session.

**Request:**
- **Method:** POST
- **URL:** `/communication/call/{roomName}/end`
- **Headers:** Requires JWT Authentication and Admin Role

**Response:**
```json
{
    "success": true,
    "message": "Call ended successfully",
    "data": {
        "id": 1,
        "status": "ENDED",
        "endedAt": "2024-03-20T13:00:00.000Z"
    }
}
```

#### PUT /communication/call/:roomName/status

**Purpose:** Update the status of a call session.

**Request:**
- **Method:** PUT
- **URL:** `/communication/call/{roomName}/status`
- **Body:**
```json
{
    "status": "STARTED" // Valid values: "CREATED", "STARTED", "ENDED"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Call status updated to STARTED",
    "data": {
        "id": 1,
        "status": "STARTED",
        "startedAt": "2024-03-20T12:30:00.000Z"
    }
}
```

#### GET /communication/calls/:queryId

**Purpose:** Get all call sessions and related messages for a specific donor query.

**Request:**
- **Method:** GET
- **URL:** `/communication/calls/{queryId}`

**Response:**
```json
{
    "success": true,
    "data": {
        "callSessions": [
            {
                "id": 1,
                "queryId": 123,
                "adminId": 456,
                "roomName": "room_xyz",
                "mode": "VIDEO",
                "status": "ENDED",
                "userToken": "user_token_here",
                "adminToken": "admin_token_here",
                "startedAt": "2024-03-20T12:30:00.000Z",
                "endedAt": "2024-03-20T13:00:00.000Z",
                "createdAt": "2024-03-20T12:00:00.000Z",
                "admin": {
                    "id": 456,
                    "name": "Admin Name",
                    "role": "ADMIN"
                }
            }
        ],
        "messages": [
            {
                "id": 1,
                "content": "Call started by admin. Mode: VIDEO",
                "messageType": "CALL_STARTED",
                "callMode": "VIDEO",
                "roomName": "room_xyz",
                "callSessionId": 1,
                "createdAt": "2024-03-20T12:30:00.000Z",
                "callSession": {
                    "id": 1,
                    "mode": "VIDEO",
                    "status": "CREATED",
                    "roomName": "room_xyz",
                    "userToken": "user_token_here",
                    "startedAt": null,
                    "endedAt": null
                }
            },
            {
                "id": 2,
                "content": "Call ended",
                "messageType": "CALL_ENDED",
                "createdAt": "2024-03-20T13:00:00.000Z"
            }
        ]
    }
}
```

**Notes:**
- This endpoint returns both call sessions and related messages for a specific query.
- Call sessions include the `userToken` needed for users to join the call.
- Messages with `messageType: "CALL_STARTED"` include the `callSession` object with all details needed to join the call.
- Users can use either the token from the call session or from the message to join the call.

#### POST /communication/call/:queryId/request

**Purpose:** Request a call session for a specific donor query. This creates a system message and notifies the assigned admin.

**Request:**
- **Method:** POST
- **URL:** `/communication/call/{queryId}/request`
- **Body:**
```json
{
    "mode": "VIDEO" // or "AUDIO", optional, defaults to "VIDEO"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Call request sent successfully",
    "data": {
        "message": {
            "id": 1,
            "content": "Donor requested a VIDEO call",
            "queryId": 123,
            "messageType": "SYSTEM",
            "callMode": "VIDEO",
            "createdAt": "2024-03-20T12:00:00.000Z"
        },
        "query": {
            // Query details
        }
    }
}
```

#### POST /communication/call/:queryId/accept-request

**Purpose:** Accept a call request and start the call session. This endpoint is restricted to the admin who is assigned to the specific query.

**Request:**
- **Method:** POST
- **URL:** `/communication/call/{queryId}/accept-request`
- **Headers:** 
  - Requires JWT Authentication
  - Requires ADMIN or SUPER_ADMIN role
  - The authenticated admin must be the one assigned to the query
- **Authorization:** Only the admin assigned to the query can accept the call request

**cURL Example:**
```bash
curl --location --request POST 'http://localhost:3000/communication/call/123/accept-request' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
    "success": true,
    "message": "Call request accepted and call initiated",
    "data": {
        "callSession": {
            "id": 1,
            "queryId": 123,
            "adminId": 456,
            "roomName": "room_xyz",
            "mode": "VIDEO",
            "status": "CREATED",
            "createdAt": "2024-03-20T12:00:00.000Z"
        },
        "room": {
            "name": "room_xyz",
            "url": "https://your-domain.daily.co/room_xyz"
        },
        "tokens": {
            "admin": "admin_token_here",
            "user": "user_token_here"
        },
        "roomUrl": "https://your-domain.daily.co/room_xyz"
    }
}
```

**Error Response:**
```json
{
    "statusCode": 403,
    "message": "You are not authorized to accept this call request"
}
```

---

## Protected Endpoints (Admin/Support Staff)

_Note: All protected endpoints require a valid JWT token along with appropriate roles (`SUPER_ADMIN` or `ADMIN`). Include the header `Authorization: Bearer YOUR_TOKEN` in your cURL requests.

### User Management

#### PUT /users/me/fcm-token

**Purpose:** Update the FCM (Firebase Cloud Messaging) token for the authenticated admin user to enable push notifications.

**Request:**
- **Method:** PUT
- **URL:** `/users/me/fcm-token`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**
```json
{
    "fcmToken": "your_firebase_cloud_messaging_token"
}
```

**cURL Example:**
```bash
curl --location --request PUT 'http://localhost:3000/users/me/fcm-token' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "fcmToken": "your_firebase_cloud_messaging_token"
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
    "avatar": "/images/admin.jpg",
    "isActive": true,
    "fcmToken": "your_firebase_cloud_messaging_token",
    "createdAt": "2024-03-20T12:00:00.000Z",
    "updatedAt": "2024-03-20T12:00:00.000Z"
}
```

#### PUT /users/me/profile

**Purpose:** Update the profile information for the authenticated admin user, including profile picture (avatar).

**Request:**
- **Method:** PUT
- **URL:** `/users/me/profile`
- **Headers:** Requires JWT Authentication and Admin Role
- **Body:**
```json
{
    "name": "Updated Admin Name",
    "email": "updated.admin@example.com",
    "avatar": "https://example.com/path/to/profile-image.jpg"
}
```

**cURL Example:**
```bash
curl --location --request PUT 'http://localhost:3000/users/me/profile' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "Updated Admin Name",
    "email": "updated.admin@example.com",
    "avatar": "https://example.com/path/to/profile-image.jpg"
}'
```

**Response:**
```json
{
    "id": 123,
    "username": "admin.user",
    "name": "Updated Admin Name",
    "email": "updated.admin@example.com",
    "role": "ADMIN",
    "avatar": "https://example.com/path/to/profile-image.jpg",
    "isActive": true,
    "fcmToken": "your_firebase_cloud_messaging_token",
    "createdAt": "2024-03-20T12:00:00.000Z",
    "updatedAt": "2024-03-20T12:30:00.000Z"
}
```

**Notes:**
- All fields in the request body are optional. Only the fields you want to update need to be included.
- The `avatar` field should contain a URL to the profile image. This can be a URL to an image hosted on your own server or a third-party service.
- The response includes the updated user profile with all fields.
- For uploading a new avatar image directly, use the POST /users/me/avatar endpoint.

#### POST /users/me/avatar

**Purpose:** Upload a new profile picture (avatar) for the authenticated admin user.

**Request:**
- **Method:** POST
- **URL:** `/users/me/avatar`
- **Headers:** 
  - Requires JWT Authentication and Admin Role
  - Content-Type: application/json
- **Body:** JSON object with a base64-encoded image
```json
{
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKYAH//Z"
}
```

**cURL Example:**
```bash
curl --location --request POST 'http://localhost:3000/users/me/avatar' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKYAH//Z",
  "isActive": true,
  "fcmToken": "your_firebase_cloud_messaging_token",
  "createdAt": "2024-03-20T12:00:00.000Z",
  "updatedAt": "2024-03-20T12:35:00.000Z"
}
```

**Response:**
```json
{
    "id": 123,
    "username": "admin.user",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN",
    "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKYAH//Z",
    "isActive": true,
    "fcmToken": "your_firebase_cloud_messaging_token",
    "createdAt": "2024-03-20T12:00:00.000Z",
    "updatedAt": "2024-03-20T12:35:00.000Z"
}
```

**Error Responses:**
```json
{
    "statusCode": 400,
    "message": "No image provided"
}
```

```json
{
    "statusCode": 400,
    "message": "Invalid image format. Must be a valid base64 encoded JPEG, PNG, or GIF"
}
```

```json
{
    "statusCode": 400,
    "message": "Image size exceeds the limit of 1MB"
}
```

**Notes:**
- The image must be provided as a base64-encoded string with the proper MIME type prefix (e.g., `data:image/jpeg;base64,`).
- Supported formats: JPEG, PNG, or GIF.
- The maximum image size is 1MB.
- The response includes the updated user profile with the new avatar as a base64 string.

#### PUT /users/me/password

**Purpose:** Change the password for the authenticated admin user.

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
    "avatar": "/images/admin.jpg",
    "isActive": true,
    "fcmToken": "your_firebase_cloud_messaging_token",
    "createdAt": "2024-03-20T12:00:00.000Z",
    "updatedAt": "2024-03-20T12:45:00.000Z"
}
```

**Error Responses:**
```json
{
    "statusCode": 401,
    "message": "Current password is incorrect"
}
```

```json
{
    "statusCode": 400,
    "message": "New password must be different from the current password"
}
```

```json
{
    "statusCode": 400,
    "message": "Password must be at least 8 characters long"
}
```

**Notes:**
- Both `currentPassword` and `newPassword` fields are required.
- The new password must be at least 8 characters long.
- The new password must be different from the current password.
- The current password must match the user's existing password.

### Messages Management

#### POST /messages/admin/:queryId

**Purpose:** Allow admins to send a message to a specific donor query. This endpoint is protected and only accessible by admins.

**Request:**
- **Method:** POST
- **URL:** `/messages/admin/{queryId}`
- **Headers:** 
  - Requires JWT Authentication
  - Requires ADMIN or SUPER_ADMIN role
- **Body:**
```json
{
    "content": "Your message here",
    "messageType": "CHAT"  // Optional, defaults to CHAT
}
```

**cURL Example:**
```bash
curl --location --request POST 'http://localhost:3000/messages/admin/123' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "content": "Your message here"
}'
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "content": "Your message here",
        "queryId": 123,
        "senderId": 456,
        "messageType": "CHAT",
        "createdAt": "2024-03-20T12:00:00.000Z",
        "sender": {
            // Admin details
        }
    }
}
```

#### GET /messages/admin/:queryId

**Purpose:** Allow admins to retrieve messages for a specific donor query. This endpoint is protected and only accessible by admins assigned to the query.

**Request:**
- **Method:** GET
- **URL:** `/messages/admin/{queryId}`
- **Headers:** 
  - Requires JWT Authentication
  - Requires ADMIN or SUPER_ADMIN role
  - The authenticated admin must be assigned to the query
- **Query Parameters:**
  - `limit` (optional, default: 50)
  - `offset` (optional, default: 0)
  - `messageType` (optional, filter by message type)

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/messages/admin/123?limit=50&offset=0' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
    "success": true,
    "data": {
        "messages": [
            {
                "id": 1,
                "content": "Message content",
                "queryId": 123,
                "senderId": 456,
                "messageType": "CHAT",
                "isFromAdmin": true,
                "createdAt": "2024-03-20T12:00:00.000Z",
                "sender": {
                    "id": 456,
                    "name": "Admin Name",
                    "username": "admin",
                    "avatar": "/images/admin.jpg",
                    "role": "ADMIN",
                    "isActive": true,
                    "isAdmin": true
                },
                "recipient": {
                    "id": 789,
                    "name": "User Name",
                    "username": "user",
                    "avatar": null,
                    "role": "USER",
                    "isActive": true
                },
                "query": {
                    "id": 123,
                    "assignedToUser": {
                        "id": 456,
                        "name": "Admin Name",
                        "role": "ADMIN"
                    }
                }
            },
            {
                "id": 2,
                "content": "User response",
                "queryId": 123,
                "senderId": 789,
                "messageType": "CHAT",
                "isFromAdmin": false,
                "createdAt": "2024-03-20T12:05:00.000Z",
                "sender": {
                    "id": 789,
                    "name": "User Name",
                    "username": "user",
                    "avatar": null,
                    "role": "USER",
                    "isActive": true,
                    "isAdmin": false
                },
                "recipient": {
                    "id": 456,
                    "name": "Admin Name",
                    "username": "admin",
                    "avatar": "/images/admin.jpg",
                    "role": "ADMIN",
                    "isActive": true
                }
            }
        ],
        "total": 10,
        "limit": 50,
        "offset": 0
    }
}
```

**Key Response Fields:**
- `isFromAdmin`: Boolean flag indicating if the message was sent by an admin
- `sender.isAdmin`: Boolean flag in the sender object for easy frontend checking

### Donor Queries Management

#### GET /donor-queries

**Purpose:** Retrieve all donor queries.

**Request:**
- **Method:** GET
- **URL:** `/donor-queries`

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/donor-queries' \
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
        "status": "PENDING_REPLY",
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

#### GET /donor-queries/admin/:id

**Purpose:** Retrieve a specific donor query by ID.

**Request:**
- **Method:** GET
- **URL:** `/donor-queries/admin/{id}`
- **Parameter:** `id` (number, parsed via `ParseIntPipe`)

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/donor-queries/admin/123' \
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
    "status": "PENDING_REPLY",
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

#### GET /donor-queries/in-progress

**Purpose:** Retrieve donor queries that are in the "IN_PROGRESS" status.

**Request:**
- **Method:** GET
- **URL:** `/donor-queries/in-progress`

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/donor-queries/in-progress' \
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

#### GET /donor-queries/pending-reply

**Purpose:** Retrieve donor queries that are in the "PENDING_REPLY" status.

**Request:**
- **Method:** GET
- **URL:** `/donor-queries/pending-reply`

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/donor-queries/pending-reply' \
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
        "status": "PENDING_REPLY",
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

#### GET /donor-queries/resolved

**Purpose:** Retrieve donor queries that are in the "RESOLVED" status.

**Request:**
- **Method:** GET
- **URL:** `/donor-queries/resolved`

**cURL Example:**
```bash
curl --location --request GET 'http://localhost:3000/donor-queries/resolved' \
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
    // ... Additional queries if applicable
]
```

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
    "status": "updated_PENDING_REPLY"
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
    "status": "updated_PENDING_REPLY"
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
    "status": "updated_PENDING_REPLY",
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
    "status": "PENDING_REPLY",
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