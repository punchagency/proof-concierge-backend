-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "donorEmail" TEXT NOT NULL,
    "description" TEXT,
    "callRequested" BOOLEAN NOT NULL DEFAULT false,
    "callType" TEXT,
    "status" TEXT NOT NULL,
    "adminId" INTEGER,
    "activeCallId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "dailyRoomUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "callType" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "userToken" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketTransfer" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromAdminId" INTEGER NOT NULL,
    "toAdminId" INTEGER NOT NULL,
    "transferNotes" TEXT,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_activeCallId_key" ON "Ticket"("activeCallId");

-- CreateIndex
CREATE INDEX "Ticket_adminId_idx" ON "Ticket"("adminId");

-- CreateIndex
CREATE INDEX "Ticket_donorId_idx" ON "Ticket"("donorId");

-- CreateIndex
CREATE INDEX "Call_ticketId_idx" ON "Call"("ticketId");

-- CreateIndex
CREATE INDEX "TextMessage_ticketId_idx" ON "TextMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TextMessage_senderId_idx" ON "TextMessage"("senderId");

-- CreateIndex
CREATE INDEX "TicketTransfer_ticketId_idx" ON "TicketTransfer"("ticketId");

-- CreateIndex
CREATE INDEX "TicketTransfer_fromAdminId_idx" ON "TicketTransfer"("fromAdminId");

-- CreateIndex
CREATE INDEX "TicketTransfer_toAdminId_idx" ON "TicketTransfer"("toAdminId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_activeCallId_fkey" FOREIGN KEY ("activeCallId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextMessage" ADD CONSTRAINT "TextMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_fromAdminId_fkey" FOREIGN KEY ("fromAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_toAdminId_fkey" FOREIGN KEY ("toAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
