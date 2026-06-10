-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACCEPTED', 'DECLINED', 'MISSED', 'ENDED');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('VOICE', 'VIDEO');

-- AlterTable: add Google Calendar OAuth fields to User
ALTER TABLE "User"
  ADD COLUMN "googleAccessToken"  TEXT,
  ADD COLUMN "googleRefreshToken" TEXT,
  ADD COLUMN "googleTokenExpiry"  TIMESTAMP(3),
  ADD COLUMN "isGoogleAuthorized" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Call
CREATE TABLE "Call" (
  "id"         TEXT NOT NULL,
  "callerId"   TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "meetLink"   TEXT,
  "meetCode"   TEXT,
  "status"     "CallStatus" NOT NULL DEFAULT 'RINGING',
  "callType"   "CallType"   NOT NULL DEFAULT 'VOICE',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "answeredAt" TIMESTAMP(3),
  "endedAt"    TIMESTAMP(3),
  "expiresAt"  TIMESTAMP(3),
  CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_callerId_fkey"
  FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Call" ADD CONSTRAINT "Call_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Call_callerId_idx"   ON "Call"("callerId");
CREATE INDEX "Call_receiverId_idx" ON "Call"("receiverId");
CREATE INDEX "Call_status_idx"     ON "Call"("status");
CREATE INDEX "Call_createdAt_idx"  ON "Call"("createdAt");
