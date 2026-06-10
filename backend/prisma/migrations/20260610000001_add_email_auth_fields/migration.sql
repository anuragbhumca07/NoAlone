-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT,
                   ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
                   ADD COLUMN "emailVerificationCode" TEXT,
                   ADD COLUMN "emailVerificationExpiry" TIMESTAMP(3);
