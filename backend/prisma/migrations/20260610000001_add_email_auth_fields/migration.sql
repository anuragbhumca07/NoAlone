-- AlterTable: add email auth fields to User (idempotent)
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "emailVerificationCode" TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "emailVerificationExpiry" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN null;
END $$;
