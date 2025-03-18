-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "QueryMode" AS ENUM ('TEXT', 'HUDDLE', 'VIDEO_CALL');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('IN_PROGRESS', 'RESOLVED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "CallMode" AS ENUM ('VIDEO', 'AUDIO', 'SCREEN');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('QUERY', 'CHAT', 'SYSTEM', 'CALL_STARTED', 'CALL_ENDED');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('CREATED', 'STARTED', 'ENDED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fcmToken" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorQuery" (
    "id" SERIAL NOT NULL,
    "donor" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "test" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "status" "QueryStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transferredTo" TEXT,
    "transferredToUserId" INTEGER,
    "resolvedById" INTEGER,
    "transferNote" TEXT,
    "assignedToId" INTEGER,
    "fcmToken" TEXT,

    CONSTRAINT "DonorQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "isFromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queryId" INTEGER,
    "callSessionId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fcmToken" TEXT,
    "recipientId" INTEGER,
    "senderId" INTEGER,
    "callMode" "CallMode",
    "roomName" TEXT,
    "messageType" "MessageType" NOT NULL DEFAULT 'QUERY',
    "userToken" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSession" (
    "id" SERIAL NOT NULL,
    "queryId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "roomName" TEXT NOT NULL,
    "mode" "CallMode" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "CallStatus" NOT NULL,
    "adminToken" TEXT,
    "userToken" TEXT,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Message_queryId_idx" ON "Message"("queryId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");

-- CreateIndex
CREATE INDEX "Message_callSessionId_idx" ON "Message"("callSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CallSession_roomName_key" ON "CallSession"("roomName");

-- CreateIndex
CREATE INDEX "CallSession_queryId_idx" ON "CallSession"("queryId");

-- CreateIndex
CREATE INDEX "CallSession_adminId_idx" ON "CallSession"("adminId");

-- AddForeignKey
ALTER TABLE "DonorQuery" ADD CONSTRAINT "DonorQuery_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorQuery" ADD CONSTRAINT "DonorQuery_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorQuery" ADD CONSTRAINT "DonorQuery_transferredToUserId_fkey" FOREIGN KEY ("transferredToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "CallSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DonorQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DonorQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
