-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "QueryMode" AS ENUM ('TEXT', 'HUDDLE', 'VIDEO_CALL');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('IN_PROGRESS', 'PENDING_REPLY', 'RESOLVED', 'TRANSFERRED');

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

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorQuery" (
    "id" SERIAL NOT NULL,
    "sid" TEXT NOT NULL,
    "donor" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "test" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "queryMode" "QueryMode" NOT NULL DEFAULT 'TEXT',
    "device" TEXT NOT NULL,
    "status" "QueryStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transferredTo" TEXT,
    "transferredToUserId" INTEGER,
    "resolvedById" INTEGER,
    "transferNote" TEXT,

    CONSTRAINT "DonorQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" INTEGER,
    "isFromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queryId" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSession" (
    "id" SERIAL NOT NULL,
    "roomName" TEXT NOT NULL,
    "roomUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "queryId" INTEGER NOT NULL,

    CONSTRAINT "VideoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queryId" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSession_roomName_key" ON "VideoSession"("roomName");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSession_queryId_key" ON "VideoSession"("queryId");

-- AddForeignKey
ALTER TABLE "DonorQuery" ADD CONSTRAINT "DonorQuery_transferredToUserId_fkey" FOREIGN KEY ("transferredToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorQuery" ADD CONSTRAINT "DonorQuery_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DonorQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSession" ADD CONSTRAINT "VideoSession_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DonorQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DonorQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
