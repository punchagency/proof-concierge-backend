-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('QUERY', 'CHAT', 'SYSTEM', 'CALL_STARTED', 'CALL_ENDED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('ADMIN', 'DONOR', 'SYSTEM');
