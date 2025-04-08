# Ticket System Documentation

## Table of Contents
- [Overview](#overview)
- [API Versioning](#api-versioning)
- [DailyJS Integration](#dailyjs-integration)
  - [Room Creation](#room-creation)
  - [Tokens Usage](#tokens-usage)
  - [Security Considerations](#security-considerations)
  - [Example Implementation](#example-implementation)
- [Database Schema](#database-schema)
  - [Tickets](#tickets)
  - [Calls](#calls)
  - [Text Messages](#text-messages)
  - [Ticket Transfers](#ticket-transfers)
- [API Endpoints](#api-endpoints)
  - [Tickets](#tickets-1)
  - [Calls](#calls-1)
  - [Text Messages](#text-messages-1)
- [Setup](#setup)
  - [Environment Variables](#environment-variables)
  - [Integration with Existing App](#integration-with-existing-app)
- [Usage Examples](#usage-examples)
- [Call Flow](#call-flow)
- [Ticket Statuses](#ticket-statuses)
- [Class Diagrams](#class-diagrams)

## Overview

The Ticket System is a new feature designed to handle donor support requests through a ticket-based workflow. It consists of three main components:

1. **Tickets** - Capture donor information and issue details
2. **Calls** - Manage audio/video calls between donors and admins
3. **Text Messages** - Handle text communication within tickets

This system allows for a streamlined donor support process, including ticket creation, call handling, text messaging, and ticket transfers between admins.

## API Versioning

All endpoints in the Ticket System are versioned using URI versioning with the prefix `api/v1`. This allows for future updates to the API without breaking existing clients. The current version is `v1`.

Examples:
- `api/v1/tickets`
- `api/v1/calls`
- `api/v1/tickets/:ticketId/messages`

## DailyJS Integration

The call functionality integrates with DailyJS to provide secure, reliable audio/video calls between donors and admins.

### Room Creation

When a call is initiated, the system:
1. Creates a unique room in DailyJS
2. Generates two tokens:
   - `userToken`: For donors with standard participant permissions
   - `adminToken`: For admins with owner permissions (can mute others, end call, etc.)
3. Both tokens expire after one hour for security

### Tokens Usage

- **User Token**: Used by the donor's client application to join the call. Has limited permissions.
- **Admin Token**: Used by the admin's client application to join the call. Has full permissions to control the call.

### Security Considerations

- **Token Segregation**: The `adminToken` is never exposed in responses to donor requests. Donors only receive their `userToken`.
- **Role-Based Responses**: All call endpoints filter the response based on the requester's role:
  - Donors see only the `userToken` in responses
  - Admins see both `userToken` and `adminToken`
- **Token Expiration**: Both tokens expire after one hour to limit the time window for potential misuse

### Example Implementation

```javascript
// Client-side example using DailyJS to join a call

// For donors:
async function joinCallAsDonor(userToken, dailyRoomUrl) {
  const callFrame = await window.DailyIframe.createFrame({
    iframeStyle: { /* styling options */ },
    showLeaveButton: true,
  });
  
  await callFrame.join({
    url: dailyRoomUrl,
    token: userToken
  });
}

// For admins:
async function joinCallAsAdmin(adminToken, dailyRoomUrl) {
  const callFrame = await window.DailyIframe.createFrame({
    iframeStyle: { /* styling options */ },
    showLeaveButton: true,
  });
  
  await callFrame.join({
    url: dailyRoomUrl,
    token: adminToken
  });
}
```

## Database Schema

### Tickets

```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY,
    donor_id VARCHAR(255) NOT NULL,         -- Provided by the donor at creation
    donor_email VARCHAR(255) NOT NULL,      -- Donor email provided during ticket creation
    description TEXT,                        -- Description of the issue
    call_requested BOOLEAN DEFAULT FALSE,    -- TRUE if the donor initiates a call
    call_type VARCHAR(50),                   -- 'audio' or 'video'
    status VARCHAR(50) NOT NULL,             -- e.g., 'new', 'pending', 'active_call', 'transferred', 'resolved', 'closed'
    admin_id INT,                            -- The admin assigned to the ticket; null until an admin accepts it
    active_call_id UUID,                     -- References the active call for this ticket (if one exists)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Calls

```sql
CREATE TABLE calls (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL,                -- Links the call to its ticket
    daily_room_url VARCHAR(255) NOT NULL,    -- The DailyJS room URL or room ID
    status VARCHAR(50) NOT NULL,             -- e.g., 'active', 'ended'
    call_type VARCHAR(50) NOT NULL,          -- 'audio' or 'video'
    initiated_by VARCHAR(50) NOT NULL,       -- 'donor' or 'admin'
    user_token TEXT NOT NULL,                -- Token for donor to join the call
    admin_token TEXT NOT NULL,               -- Token for admin to join the call
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,                      -- Null until the call ends
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Text Messages

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL,                 -- Associates the message with a specific ticket
    sender_id VARCHAR(255) NOT NULL,         -- Can be the donor's or admin's id
    sender_type VARCHAR(50) NOT NULL,        -- 'donor' or 'admin'
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- e.g., 'text', 'system' (for system messages like transfers)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Ticket Transfers

```sql
CREATE TABLE ticket_transfers (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL,
    from_admin_id INT NOT NULL,
    to_admin_id INT NOT NULL,
    transfer_notes TEXT,
    transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Tickets

#### Create a Ticket
- **URL**: `POST /api/v1/tickets`
- **Authentication**: Public
- **Description**: Create a new ticket. A call is automatically created for each new ticket.
- **Request Body**:
  ```json
  {
    "donorId": "string",         // Required: Donor identifier
    "donorEmail": "string",      // Required: Donor email address
    "description": "string",     // Optional: Description of the issue
    "callType": "audio"|"video"  // Required: Type of call to create
  }
  ```
- **Response**: 201 Created
  ```json
  {
    "id": "uuid",
    "donorId": "string",
    "donorEmail": "string",
    "description": "string",
    "callRequested": true,
    "callType": "string",
    "status": "new",
    "adminId": null,
    "activeCallId": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "call": {
      "id": "uuid",
      "dailyRoomUrl": "string",
      "status": "active",
      "userToken": "string"      // Token for donor to join the call
    }
  }
  ```

#### Get All Tickets
- **URL**: `GET /api/v1/tickets`
- **Authentication**: JWT Auth (Admin)
- **Description**: Get all tickets
- **Query Parameters**:
  - `status` (optional): Filter tickets by status
- **Response**: 200 OK
  ```json
  [
    {
      "id": "uuid",
      "donorId": "string",
      "donorEmail": "string",
      "description": "string",
      "callRequested": boolean,
      "callType": "string",
      "status": "string",
      "adminId": number|null,
      "activeCallId": "uuid"|null,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    // Additional tickets...
  ]
  ```

#### Get Ticket Details
- **URL**: `GET /api/v1/tickets/:id`
- **Authentication**: JWT Auth (Admin)
- **Description**: Get details for a specific ticket
- **Path Parameters**:
  - `id`: UUID of the ticket
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "donorId": "string",
    "donorEmail": "string",
    "description": "string",
    "callRequested": boolean,
    "callType": "string",
    "status": "string",
    "adminId": number|null,
    "activeCallId": "uuid"|null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "activeCall": {
      "id": "string",
      "dailyRoomUrl": "string",
      "adminToken": "string",
      "userToken": "string",
      "status": "string",
      "callType": "string",
      "startedAt": "string"
    }
  }
  ```
  Note: The `activeCall` field is only included when there is an active call associated with the ticket.

#### Update Ticket
- **URL**: `PUT /api/v1/tickets/:id`
- **Authentication**: JWT Auth (Admin)
- **Description**: Update ticket details
- **Path Parameters**:
  - `id`: UUID of the ticket
- **Request Body**:
  ```json
  {
    "description": "string",    // Optional: Updated description
    "status": "string",         // Optional: Updated status
    "adminId": number           // Optional: Admin assignment
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "donorId": "string",
    "donorEmail": "string",
    "description": "string",
    "callRequested": boolean,
    "callType": "string",
    "status": "string",
    "adminId": number|null,
    "activeCallId": "uuid"|null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### Assign Ticket to Admin
- **URL**: `PUT /api/v1/tickets/:id/assign`
- **Authentication**: JWT Auth (Admin)
- **Description**: Assign ticket to the current admin
- **Path Parameters**:
  - `id`: UUID of the ticket
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "donorId": "string",
    "donorEmail": "string",
    "description": "string",
    "callRequested": boolean,
    "callType": "string",
    "status": "pending",
    "adminId": number,           // Will be set to current admin's ID
    "activeCallId": "uuid"|null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "activeCall": {              // Only included if there is an active call
      "id": "uuid",
      "dailyRoomUrl": "string",
      "adminToken": "string",
      "userToken": "string",
      "status": "active",
      "callType": "string",
      "startedAt": "timestamp"
    }
  }
  ```

#### Transfer Ticket
- **URL**: `POST /api/v1/tickets/:id/transfer`
- **Authentication**: JWT Auth (Admin)
- **Description**: Transfer a ticket to another admin
- **Path Parameters**:
  - `id`: UUID of the ticket
- **Request Body**:
  ```json
  {
    "toAdminId": number,          // Required: Target admin ID
    "transferNotes": "string"     // Optional: Notes about the transfer
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "donorId": "string",
    "donorEmail": "string",
    "description": "string",
    "callRequested": boolean,
    "callType": "string",
    "status": "transferred",
    "adminId": number,           // Will be set to target admin's ID
    "activeCallId": "uuid"|null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### Resolve Ticket
- **URL**: `PUT /api/v1/tickets/:id/resolve`
- **Authentication**: JWT Auth (Admin)
- **Description**: Mark a ticket as resolved
- **Path Parameters**:
  - `id`: UUID of the ticket
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "donorId": "string",
    "donorEmail": "string",
    "description": "string",
    "callRequested": boolean,
    "callType": "string",
    "status": "resolved",
    "adminId": number,
    "activeCallId": "uuid"|null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### Close Ticket
- **URL**: `PUT /api/v1/tickets/:id/close`
- **Authentication**: JWT Auth (Admin)
- **Description**: Close a ticket
- **Path Parameters**:
  - `id`: UUID of the ticket
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "donorId": "string",
    "donorEmail": "string",
    "description": "string",
    "callRequested": boolean,
    "callType": "string",
    "status": "closed",
    "adminId": number,
    "activeCallId": "uuid"|null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### Get Ticket Transfer History
- **URL**: `GET /api/v1/tickets/:id/transfers`
- **Authentication**: JWT Auth (Admin)
- **Description**: Get transfer history for a ticket
- **Path Parameters**:
  - `id`: UUID of the ticket
- **Response**: 200 OK
  ```json
  [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "fromAdminId": number,
      "toAdminId": number,
      "transferNotes": "string",
      "transferredAt": "timestamp",
      "fromAdmin": {
        "id": number,
        "username": "string",
        "name": "string"
      },
      "toAdmin": {
        "id": number,
        "username": "string",
        "name": "string"
      }
    },
    // Additional transfers...
  ]
  ```

#### Get Dashboard Tickets
- **URL**: `GET /api/v1/tickets/dashboard`
- **Authentication**: JWT Auth (Admin)
- **Description**: Get tickets grouped by status categories for dashboard display. For regular admins, returns both unassigned tickets and their assigned tickets. For super admins, returns all tickets.
- **Response**: 200 OK
  ```json
  {
    "newTickets": [
      {
        "id": "uuid",
        "donorId": "string",
        "donorEmail": "string",
        "description": "string",
        "status": "new",
        "adminId": number|null,
        "admin": {
          "id": number,
          "name": "string",
          "username": "string",
          "avatar": "string"
        },
        // Other ticket properties...
      },
      // Additional new tickets...
    ],
    "pendingTickets": [
      {
        "id": "uuid",
        "donorId": "string",
        "donorEmail": "string",
        "description": "string",
        "status": "pending",
        "adminId": number,
        "admin": {
          "id": number,
          "name": "string",
          "username": "string",
          "avatar": "string"
        },
        // Other ticket properties...
      },
      // Additional pending tickets...
    ],
    "activeCallTickets": [
      {
        "id": "uuid",
        "donorId": "string",
        "donorEmail": "string",
        "description": "string",
        "status": "active_call",
        "adminId": number|null,
        "admin": {
          "id": number,
          "name": "string",
          "username": "string",
          "avatar": "string"
        },
        // Other ticket properties...
        "calls": [
          {
            "id": "uuid",
            "status": "active",
            // Other call properties...
          }
        ]
      },
      // Additional active call tickets...
    ],
    "transferredTickets": [
      {
        "id": "uuid",
        "donorId": "string",
        "donorEmail": "string",
        "description": "string",
        "status": "transferred",
        "adminId": number,
        "admin": {
          "id": number,
          "name": "string",
          "username": "string",
          "avatar": "string"
        },
        // Other ticket properties...
      },
      // Additional transferred tickets...
    ],
    "counts": {
      "new": 5,
      "pending": 12,
      "activeCall": 3,
      "transferred": 2,
      "total": 22,
      "unassigned": {
        "new": 3,
        "activeCall": 1,
        "total": 4
      }
    }
  }
  ```

#### Get Donor Ticket History
- **URL**: `GET /api/v1/tickets/donor/:donorId`
- **Authentication**: Public
- **Description**: Get ticket history for a specific donor
- **Path Parameters**:
  - `donorId`: ID of the donor
- **Response**: 200 OK
  ```json
  [
    {
      "id": "uuid",
      "description": "string",
      "status": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "callType": "string"
    },
    // Additional tickets...
  ]
  ```

#### Get Ticket Details for Donor
- **URL**: `GET /api/v1/tickets/:id/donor/:donorId`
- **Authentication**: Public
- **Description**: Get detailed information about a specific ticket for a donor, including active call if available
- **Path Parameters**:
  - `id`: UUID of the ticket
  - `donorId`: ID of the donor (used for verification)
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "donorId": "string",
    "donorEmail": "string",
    "description": "string",
    "status": "string",
    "callRequested": boolean,
    "callType": "string",
    "activeCallId": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "activeCall": {
      "id": "uuid",
      "callType": "string",
      "dailyRoomUrl": "string",
      "userToken": "string",
      "status": "string",
      "startedAt": "timestamp"
    }
  }
  ```

#### Resolve Ticket as Donor
- **URL**: `PUT /api/v1/tickets/:id/donor/:donorId/resolve`
- **Authentication**: Public
- **Description**: Allow a donor to resolve their own ticket. Requires both ticket ID and donor ID for verification. If there is an active call, it will automatically be ended as part of the resolution process.
- **Path Parameters**:
  - `id`: UUID of the ticket
  - `donorId`: ID of the donor (used for verification)
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "donorId": "string",
    "donorEmail": "string",
    "description": "string",
    "callRequested": boolean,
    "callType": "string",
    "status": "resolved",
    "adminId": number|null,
    "activeCallId": null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

### Calls

#### Create a Call
- **URL**: `POST /api/v1/calls`
- **Authentication**: Public/JWT Auth
- **Description**: Create a new call
- **Request Body**:
  ```json
  {
    "ticketId": "uuid",                 // Required: Ticket to associate with call
    "callType": "audio"|"video",        // Required: Type of call
    "initiatedBy": "donor"|"admin"      // Required: Who initiated the call
  }
  ```
- **Response (Donor)**: 201 Created
  ```json
  {
    "id": "uuid",
    "ticketId": "uuid",
    "dailyRoomUrl": "string",
    "status": "active",
    "callType": "string",
    "initiatedBy": "string",
    "startedAt": "timestamp",
    "endedAt": null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "userToken": "string"      // Token for donor to join
  }
  ```
- **Response (Admin)**: 201 Created
  ```json
  {
    "id": "uuid",
    "ticketId": "uuid",
    "dailyRoomUrl": "string",
    "status": "active",
    "callType": "string",
    "initiatedBy": "string",
    "startedAt": "timestamp",
    "endedAt": null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "userToken": "string",      // Token for donor to join
    "adminToken": "string"      // Token for admin to join
  }
  ```

#### Get All Calls
- **URL**: `GET /api/v1/calls`
- **Authentication**: JWT Auth (Admin)
- **Description**: Get all calls
- **Response**: 200 OK
  ```json
  [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "dailyRoomUrl": "string",
      "status": "string",
      "callType": "string",
      "initiatedBy": "string",
      "startedAt": "timestamp",
      "endedAt": "timestamp"|null,
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "userToken": "string",
      "adminToken": "string"
    },
    // Additional calls...
  ]
  ```

#### Get Call Details
- **URL**: `GET /api/v1/calls/:id`
- **Authentication**: Public/JWT Auth
- **Description**: Get details for a specific call
- **Path Parameters**:
  - `id`: UUID of the call
- **Response (Donor)**: 200 OK
  ```json
  {
    "id": "uuid",
    "ticketId": "uuid",
    "dailyRoomUrl": "string",
    "status": "string",
    "callType": "string",
    "initiatedBy": "string",
    "startedAt": "timestamp",
    "endedAt": "timestamp"|null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "userToken": "string"
  }
  ```
- **Response (Admin)**: 200 OK
  ```json
  {
    "id": "uuid",
    "ticketId": "uuid",
    "dailyRoomUrl": "string",
    "status": "string",
    "callType": "string",
    "initiatedBy": "string",
    "startedAt": "timestamp",
    "endedAt": "timestamp"|null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "userToken": "string",
    "adminToken": "string"
  }
  ```

#### Update Call Status
- **URL**: `PUT /api/v1/calls/:id`
- **Authentication**: JWT Auth (Admin)
- **Description**: Update a call's status
- **Path Parameters**:
  - `id`: UUID of the call
- **Request Body**:
  ```json
  {
    "status": "string"         // Required: New status ('active' or 'ended')
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "ticketId": "uuid",
    "dailyRoomUrl": "string",
    "status": "string",        // Updated status
    "callType": "string",
    "initiatedBy": "string",
    "startedAt": "timestamp",
    "endedAt": "timestamp"|null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "userToken": "string",
    "adminToken": "string"
  }
  ```

#### Get Calls for a Ticket
- **URL**: `GET /api/v1/calls/ticket/:ticketId`
- **Authentication**: Public/JWT Auth
- **Description**: Get all calls for a specific ticket
- **Path Parameters**:
  - `ticketId`: UUID of the ticket
- **Response (Donor)**: 200 OK
  ```json
  [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "dailyRoomUrl": "string",
      "status": "string",
      "callType": "string",
      "initiatedBy": "string",
      "startedAt": "timestamp",
      "endedAt": "timestamp"|null,
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "userToken": "string"
    },
    // Additional calls...
  ]
  ```
- **Response (Admin)**: 200 OK
  ```json
  [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "dailyRoomUrl": "string",
      "status": "string",
      "callType": "string",
      "initiatedBy": "string",
      "startedAt": "timestamp",
      "endedAt": "timestamp"|null,
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "userToken": "string",
      "adminToken": "string"
    },
    // Additional calls...
  ]
  ```

#### End a Call
- **URL**: `POST /api/v1/calls/:id/end`
- **Authentication**: Public/JWT Auth
- **Description**: End an active call. This updates the call status to "ended", sets the endedAt timestamp, and updates the associated ticket to remove the activeCallId reference.
- **Path Parameters**:
  - `id`: UUID of the call
- **Request Body**: None required
- **Response (Donor)**: 200 OK
  ```json
  {
    "id": "uuid",
    "ticketId": "uuid",
    "dailyRoomUrl": "string",
    "status": "ended",
    "callType": "string",
    "initiatedBy": "string",
    "startedAt": "timestamp",
    "endedAt": "timestamp",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "userToken": "string"
  }
  ```
- **Response (Admin)**: 200 OK
  ```json
  {
    "id": "uuid",
    "ticketId": "uuid",
    "dailyRoomUrl": "string", 
    "status": "ended",
    "callType": "string",
    "initiatedBy": "string",
    "startedAt": "timestamp",
    "endedAt": "timestamp",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "userToken": "string",
    "adminToken": "string"
  }
  ```

### Text Messages

#### Send a Message
- **URL**: `POST /api/v1/tickets/:ticketId/messages`
- **Authentication**: Public/JWT Auth
- **Description**: Send a message for a ticket
- **Path Parameters**:
  - `ticketId`: UUID of the ticket
- **Request Body**:
  ```json
  {
    "senderId": "string",              // Required: ID of the sender
    "senderType": "donor"|"admin",     // Required: Type of sender
    "content": "string"                // Required: Message content
  }
  ```
- **Response**: 201 Created
  ```json
  {
    "id": "uuid",
    "ticketId": "uuid",
    "senderId": "string",
    "senderType": "string",
    "content": "string",
    "messageType": "text",
    "isRead": false,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### Get Messages for a Ticket
- **URL**: `GET /api/v1/tickets/:ticketId/messages`
- **Authentication**: Public/JWT Auth
- **Description**: Get all messages for a ticket
- **Path Parameters**:
  - `ticketId`: UUID of the ticket
- **Response**: 200 OK
  ```json
  [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "senderId": "string",
      "senderType": "string",
      "content": "string",
      "messageType": "string",
      "isRead": boolean,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    // Additional messages...
  ]
  ```

#### Update Message
- **URL**: `PUT /api/v1/tickets/:ticketId/messages/:id`
- **Authentication**: JWT Auth (Admin)
- **Description**: Update a message (e.g., mark as read)
- **Path Parameters**:
  - `ticketId`: UUID of the ticket
  - `id`: UUID of the message
- **Request Body**:
  ```json
  {
    "isRead": boolean
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "id": "uuid",
    "ticketId": "uuid",
    "senderId": "string",
    "senderType": "string",
    "content": "string",
    "messageType": "string",
    "isRead": boolean,         // Updated read status
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### Mark Messages as Read
- **URL**: `POST /api/v1/tickets/:ticketId/messages/mark-read`
- **Authentication**: Public/JWT Auth
- **Description**: Mark all messages from a specific sender type as read
- **Path Parameters**:
  - `ticketId`: UUID of the ticket
- **Request Body**:
  ```json
  {
    "senderType": "donor"|"admin"     // Required: Type of sender whose messages to mark as read
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "success": true
  }
  ```

## Setup

### Environment Variables

Add the following environment variable for DailyJS integration:

```
DAILY_API_KEY=your_daily_api_key
```

### Integration with Existing App

The ticket system is implemented as separate modules in the NestJS application:

1. **TicketsModule** - Handles ticket creation, management, and transfers
2. **CallsModule** - Manages call sessions using DailyJS integration
3. **TextMessagesModule** - Handles text communication within tickets

These modules are registered in the main app module and use the existing database module for Prisma integration.

## Usage Examples

### Creating a Ticket

```json
// POST /api/v1/tickets
{
  "donorId": "donor123",
  "donorEmail": "donor@example.com",
  "description": "I need help with my account",
  "callType": "video"
}
```

### Starting a Call

```json
// POST /api/v1/calls
{
  "ticketId": "ticket-uuid-here",
  "callType": "video",
  "initiatedBy": "donor"
}
```

### Sending a Message

```json
// POST /api/v1/tickets/:ticketId/messages
{
  "senderId": "donor123",
  "senderType": "donor",
  "content": "Hello, I need assistance with my donation."
}
```

### Transferring a Ticket

```json
// POST /api/v1/tickets/:ticketId/transfer
{
  "toAdminId": 456,
  "transferNotes": "Transferring to a specialist for further assistance."
}
```

## Call Flow

1. Donor creates a ticket (which automatically creates a call)
2. System creates a DailyJS room and a call record with status "active"
3. Ticket status is updated to "active_call"
4. When call ends, call status is updated to "ended" and ticket status returns to "pending"

## Ticket Statuses

- **new** - Just created, not assigned
- **pending** - Assigned to an admin, awaiting resolution
- **active_call** - Currently in a call
- **transferred** - Transferred to another admin
- **resolved** - Issue resolved
- **closed** - Ticket closed

## Class Diagrams

### Ticket Entity

- **id**: string
- **donorId**: string
- **donorEmail**: string
- **description**: string | null
- **callRequested**: boolean
- **callType**: string | null
- **status**: string
- **adminId**: number | null
- **activeCallId**: string | null
- **createdAt**: Date
- **updatedAt**: Date

### Call Entity

- **id**: string
- **ticketId**: string
- **dailyRoomUrl**: string
- **status**: string
- **callType**: string
- **initiatedBy**: string
- **startedAt**: Date
- **endedAt**: Date | null
- **userToken**: string
- **adminToken**: string
- **createdAt**: Date
- **updatedAt**: Date

### TextMessage Entity

- **id**: string
- **ticketId**: string
- **senderId**: string
- **senderType**: string
- **content**: string
- **messageType**: string
- **isRead**: boolean
- **createdAt**: Date
- **updatedAt**: Date 