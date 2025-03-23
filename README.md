# Proof Concierge Backend

## Overview

Proof Concierge Backend is a NestJS-based backend service designed to power the Proof Concierge application. It handles support tickets (referred to as donor queries), chat functionalities, call requests, and admin/task assignment operations. The system is built with a focus on both a seamless support experience for end users and robust administrative tools for support staff.

## Features

- **Support Tickets (Donor Queries):** 
  - Users can submit support tickets (queries) without authentication.
  - Tickets include essential details, such as donor information, query mode, device info, and more.
  - Chat messages and call requests can be attached to a query for real-time communication.

- **Video & Audio Calls:**
  - Integrated with VideoSDK for real-time communication between donors and admins.
  - Support for video calls, audio-only calls, and screen sharing.
  - Call request system with notification support.
  - See [VideoSDK Documentation](./VIDEOSDK_DOCUMENTATION.md) for detailed information.

- **Public Endpoints:**
  - **POST `/donor-queries`**: Create a new support ticket. (Public, no authentication required)
  - **GET `/donor-queries/:id`**: Retrieve details of a support ticket by its ID (public).
  - **GET `/donor-queries/user?donorId=...`**: Fetch all support tickets associated with a given donorId.
  - **GET `/donor-queries/general`**: Retrieve queries that are in-progress. Supports filtering by test, stage, queryMode, device, and date.

- **Protected Endpoints (For Admins/Support Staff):**
  - **GET `/donor-queries`**: List all support tickets.
  - **GET `/donor-queries/admin/:id`**: Retrieve ticket details by ID with enhanced security checks.
  - **GET `/donor-queries/in-progress`**: Get queries with status "IN_PROGRESS" with filter options.
  - **GET `/donor-queries/resolved`**, **`/transferred`**: Endpoints for various query statuses.
  - **PATCH `/donor-queries/:id`**: Update a ticket (change internal notes, status, etc.).
  - **PATCH `/donor-queries/:id/resolve`**: Mark a ticket as resolved.
  - **PATCH `/donor-queries/:id/transfer`**: Transfer a ticket to another admin.
  - **POST `/donor-queries/:id/send-reminder`**: Send a reminder for a ticket.
  - **DELETE `/donor-queries/:id`**: Delete (or archive) a ticket.
  - **PATCH `/donor-queries/:id/accept`**: Endpoint for accepting a ticket by a support admin.

- **Authentication & Authorization:**
  - JWT-based authentication is used to secure protected endpoints.
  - Endpoints are annotated with an `@Public()` decorator to allow public access where necessary.
  - Role-based guards (e.g., `RolesGuard`) are used to restrict access for administrative operations (roles like `SUPER_ADMIN` and `ADMIN`).

## Technology Stack

- **Backend Framework:** NestJS
- **Language:** TypeScript
- **Database:** Prisma ORM (connecting to a relational database, e.g., PostgreSQL)
- **Authentication:** JWT based (using `JwtAuthGuard` and custom decorators)
- **Video/Audio Calls:** VideoSDK for real-time communication

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd proof-concierge-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory and provide the required environment variables. Example:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/database
   JWT_SECRET=your_jwt_secret
   PORT=3000
   
   # VideoSDK Integration
   VIDEOSDK_API_KEY=your_videosdk_api_key
   VIDEOSDK_SECRET_KEY=your_videosdk_secret_key
   ```
   For more details on the VideoSDK integration, see [VIDEOSDK_DOCUMENTATION.md](./VIDEOSDK_DOCUMENTATION.md).

4. **Database Migrations:**
   This project uses Prisma for ORM. If you have made any changes to the Prisma schema, run:
   ```bash
   npx prisma migrate dev
   ```
   _Note:_ With the current updates, no new migrations are required as the changes are limited to querying and handling data.

5. **Running the Application:**
   ```bash
   npm run start:dev
   ```

## API Documentation

### Public Endpoints

- **POST `/donor-queries`**: Create a new donor query (support ticket).
  - **Body:** Must conform to `CreateDonorQueryDto` (includes fields like `sid`, `donor`, `donorId`, `test`, `stage`, etc.).

- **GET `/donor-queries/:id`**: Get the details of a single query. Uses `ParseIntPipe` for converting the ID.

- **GET `/donor-queries/user?donorId=...`**: Retrieve all queries for a specific donor. This ties the query to the donorId provided by the client and includes associated chat messages and call requests.

- **GET `/donor-queries/general`**: Retrieve queries that are in-progress. Supports filtering by test, stage, queryMode, device, and date.

### Protected Endpoints (Require Admin Access)

- **GET `/donor-queries`**: List all donor queries (requires roles: SUPER_ADMIN, ADMIN).

- **GET `/donor-queries/admin/:id`**: Retrieve a single query by ID. Uses `ParseIntPipe` for the parameter.

- **GET `/donor-queries/in-progress`**, **`/resolved`**, **`/transferred`**: Fetch donor queries filtered by specific statuses with additional filtering options provided via query parameters.

- **PATCH `/donor-queries/:id`**: Update a donor query's details.

- **PATCH `/donor-queries/:id/resolve`**: Mark a query as resolved.

- **PATCH `/donor-queries/:id/transfer`**: Transfer a query to another admin; include `transferredToUserId` and optionally a `transferNote` in the request body.

- **POST `/donor-queries/:id/send-reminder`**: Send reminders related to a query.

- **DELETE `/donor-queries/:id`**: Delete a query from the system (requires SUPER_ADMIN access).

- **PATCH `/donor-queries/:id/accept`**: Endpoint for a user to accept a donor query for resolution.

### Call and Communication Endpoints

- **POST `/api/v1/communication/call/:queryId`**: Start a video/audio call for a given query (admin only).

- **POST `/api/v1/communication/call/:queryId/request`**: Request a call as a donor (public).

- **POST `/api/v1/communication/call/:queryId/accept-request`**: Accept a pending call request (admin only).

- **POST `/api/v1/communication/call/:roomName/end`**: End an ongoing call (admin only).

- **GET `/api/v1/communication/call/calls/:queryId`**: Get all call details for a specific query.

- **PUT `/api/v1/communication/call/:roomName/status`**: Update call status (e.g., when a user joins).

## Code Structure

- **src/**
  - **auth/**: Authentication related logic, including JWT guards, public decorators, and role-based decorators.
  - **database/**: Contains the Prisma service for database interactions.
  - **donor-queries/**: Module handling donor queries (support tickets), including controllers, services, and DTOs.
  - **communication/**: Services and controllers for chat messaging and video/audio calls via VideoSDK.
  - **Other modules:** Additional modules serve other parts of the application as required.

## Authentication & Authorization

- **JWT Authentication:**
  - All secure endpoints use the `JwtAuthGuard` unless explicitly marked with `@Public()`.
  - Tokens must be generated and provided in the `Authorization` header as a Bearer token.

- **Role Guards:**
  - Certain endpoints require roles such as `SUPER_ADMIN` or `ADMIN` (verified using `RolesGuard` and `@Roles()` decorators).

## Testing & Development

- The project supports hot-reloading for development using `npm run start:dev`.
- Unit and integration tests can be added using Jest; see the `/test` directory (if available) for example tests.

## Contributing

Contributions are welcome! Please ensure you follow the established coding patterns and write tests for new features or bug fixes.

## License

This project is licensed under the MIT License.

## Contact

For any inquiries or support:

- [Your Name](mailto:your.email@example.com)

Happy Coding!