# Proof Concierge Backend - System Overview

This document provides a comprehensive overview of the Proof Concierge Backend system, its architecture, core components, and request flows.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
   - [Authentication and Authorization](#authentication-and-authorization)
   - [Donor Queries Management](#donor-queries-management)
   - [Messaging System](#messaging-system)
   - [Communication System](#communication-system)
   - [Real-time Notifications](#real-time-notifications)
3. [Database Schema](#database-schema)
4. [Request Flows](#request-flows)
   - [Donor Query Lifecycle](#donor-query-lifecycle)
   - [Call Request and Session Flow](#call-request-and-session-flow)
   - [Admin Management Flows](#admin-management-flows)
5. [API Endpoints Summary](#api-endpoints-summary)
6. [Integration with External Services](#integration-with-external-services)

## System Architecture

The Proof Concierge Backend is built using NestJS, a progressive Node.js framework for building efficient, scalable server-side applications. The system follows a modular architecture with clear separation of concerns:

- **Controllers**: Handle HTTP requests and delegate processing to services
- **Services**: Implement business logic and interact with the database
- **Gateways**: Manage WebSocket connections for real-time communication
- **Guards**: Implement authentication and authorization
- **DTOs**: Define data transfer objects for request validation
- **Entities**: Represent database models

The system uses PostgreSQL for data persistence, with Prisma as the ORM. For real-time communication, it employs Socket.IO through NestJS's WebSocketGateway. Video call functionality is integrated with Daily.co, and Firebase is used for push notifications.

## Core Components

### Authentication and Authorization

The system implements JWT-based authentication. When users log in, they receive a JWT token that must be included in subsequent requests to access protected endpoints.

**Key Features**:
- JWT token generation and validation
- Role-based access control (SUPER_ADMIN, ADMIN)
- Public endpoints that don't require authentication
- User management for admin profiles

### Donor Queries Management

This is the central module that handles support tickets (donor queries) throughout their lifecycle, from creation to resolution.

**Key Features**:
- Creating new donor queries from external systems
- Assigning queries to admin users
- Updating query status (IN_PROGRESS, RESOLVED, TRANSFERRED)
- Transferring queries between admin users
- Sending reminders for pending queries
- Allowing donors to close their own queries

### Messaging System

Enables communication between donors and admin users through a structured messaging system.

**Key Features**:
- Different message types (QUERY, CHAT, SYSTEM, CALL_STARTED, CALL_ENDED)
- Retrieval of message history
- Support for direct messages between users
- System messages for status updates and events

### Communication System

Manages video and audio calls between donors and admin users using Daily.co as the underlying platform.

**Key Features**:
- Initiation of video/audio calls
- Call request management
- Room creation and token generation
- Call status tracking (CREATED, STARTED, ENDED)
- Screen sharing capabilities

### Real-time Notifications

Provides instant updates to both donors and admin users using WebSockets and push notifications.

**Key Features**:
- WebSocket connections for real-time updates
- Room-based subscription system
- Notification for new queries, status changes, and messages
- Integration with Firebase for push notifications to mobile devices

## Database Schema

The system uses several key database models:

### User
Represents admin users with authentication information and role assignments.

**Key Fields**:
- `id`: Unique identifier
- `username`: Unique username for login
- `password`: Hashed password
- `name`: Full name
- `email`: Email address
- `role`: User role (ADMIN, SUPER_ADMIN)
- `avatar`: Profile picture
- `fcmToken`: Firebase Cloud Messaging token for notifications

### DonorQuery
Represents a support ticket created by a donor.

**Key Fields**:
- `id`: Unique identifier
- `donor`: Donor name or email
- `donorId`: Donor unique identifier
- `test`: Test name related to the query
- `stage`: Test stage
- `device`: Device information
- `status`: Query status (IN_PROGRESS, RESOLVED, TRANSFERRED)
- `assignedToId`: ID of the admin assigned to handle the query
- `resolvedById`: ID of the admin who resolved the query
- `transferredToUserId`: ID of the admin the query was transferred to

### Message
Represents a text message within the system.

**Key Fields**:
- `id`: Unique identifier
- `content`: Message content
- `queryId`: Related donor query
- `senderId`: User who sent the message
- `recipientId`: User who received the message
- `messageType`: Type of message (QUERY, CHAT, SYSTEM, CALL_STARTED, CALL_ENDED)
- `callMode`: For call-related messages, the mode of the call (VIDEO, AUDIO, SCREEN)
- `callSessionId`: Related call session

### CallSession
Represents a video or audio call session.

**Key Fields**:
- `id`: Unique identifier
- `queryId`: Related donor query
- `adminId`: Admin who initiated the call
- `roomName`: Daily.co room name
- `mode`: Call mode (VIDEO, AUDIO, SCREEN)
- `status`: Call status (CREATED, STARTED, ENDED)
- `startedAt`: When the call started
- `endedAt`: When the call ended
- `adminToken`: Token for admin to join the call
- `userToken`: Token for user to join the call

### CallRequest
Represents a request for a call initiated by a donor.

**Key Fields**:
- `id`: Unique identifier
- `queryId`: Related donor query
- `adminId`: Admin who accepted/rejected the request
- `mode`: Requested call mode (VIDEO, AUDIO, SCREEN)
- `message`: Optional message about the request
- `status`: Request status (PENDING, ACCEPTED, REJECTED, CANCELLED)

## Request Flows

### Donor Query Lifecycle

1. **Creation**: A donor creates a new query using the `POST /donor-queries` endpoint
2. **Listing**: Admins can see all pending queries via `GET /donor-queries/in-progress`
3. **Assignment**: An admin accepts a query via `PATCH /donor-queries/:id/accept` 
4. **Communication**: Both parties exchange messages via the messaging endpoints
5. **Resolution**: 
   - Admin resolves the query via `PATCH /donor-queries/:id/resolve`
   - Donor can self-resolve via `POST /donor-queries/:id/donor-close`
   - Admin can transfer to another admin via `PATCH /donor-queries/:id/transfer`

Throughout this flow, real-time WebSocket notifications keep both sides informed of status changes.

### Call Request and Session Flow

1. **Request**: Donor requests a call via `POST /communication/call/:queryId/request`
2. **Notification**: Admin receives real-time notification of call request
3. **Acceptance**: Admin accepts request via `POST /communication/call/:queryId/accept-request`
4. **Room Creation**: System creates Daily.co room and generates tokens
5. **Call Initiation**: Both parties join the call using the provided tokens
6. **Status Updates**: Call status changes (CREATED → STARTED → ENDED) via status update endpoint
7. **Termination**: Call ends with `POST /communication/call/:roomName/end`

### Admin Management Flows

1. **Authentication**: Admin logs in via `POST /auth/login`
2. **Profile Management**: Admin can update profile, avatar, and password
3. **Query Management**: Admin views, accepts, resolves, and transfers queries
4. **Communication**: Admin exchanges messages and initiates/accepts calls with donors
5. **Dashboard View**: Real-time WebSocket updates keep dashboards current

## API Endpoints Summary

The system exposes several categories of endpoints:

### Public Endpoints

- **Authentication**: Login and user management
- **Health Checks**: System health monitoring
- **Donor Queries**: Creating and viewing queries, self-closing queries
- **Messages**: Sending and retrieving messages
- **Communication**: Call request initiation, joining calls

### Protected Endpoints (Admin/Support Staff)

- **User Management**: Profile, password, and FCM token updates
- **Messages Management**: Admin-specific message operations
- **Donor Queries Management**: Query assignment, resolution, and transfer
- **Communication Management**: Call initiation, acceptance, and monitoring

## Integration with External Services

### Daily.co

Used for video and audio call functionality, integrated through:
- Room creation for each call session
- Token generation for secure access
- API integration for room management

### Firebase Cloud Messaging

Used for push notifications to mobile devices, integrated through:
- FCM token management for users
- Push notification sending for various events
- Configuration in the NotificationsService

### PostgreSQL Database

Primary data storage using:
- Prisma ORM for data access
- Structured schema with relationships
- Indexed fields for performance

### Socket.IO

Real-time communication via:
- WebSocket connections with authentication
- Room-based message distribution
- Event-based notification system
