-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACCEPTED', 'DECLINED', 'MISSED', 'ENDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CallType" AS ENUM ('VOICE', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable: add Google Calendar OAuth fields to User (idempotent)
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "googleAccessToken"  TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "googleRefreshToken" TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "googleTokenExpiry"  TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "isGoogleAuthorized" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- CreateTable: Call (idempotent)
CREATE TABLE IF NOT EXISTS "Call" (
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

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "Call" ADD CONSTRAINT "Call_callerId_fkey"
    FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Call" ADD CONSTRAINT "Call_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Call_callerId_idx"   ON "Call"("callerId");
CREATE INDEX IF NOT EXISTS "Call_receiverId_idx" ON "Call"("receiverId");
CREATE INDEX IF NOT EXISTS "Call_status_idx"     ON "Call"("status");
CREATE INDEX IF NOT EXISTS "Call_createdAt_idx"  ON "Call"("createdAt");
