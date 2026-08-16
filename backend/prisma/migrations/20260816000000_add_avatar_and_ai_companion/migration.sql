-- AddColumn
ALTER TABLE "User" ADD COLUMN "avatarConfig" JSONB;

-- CreateEnum
CREATE TYPE "AiChatRole" AS ENUM ('USER', 'AI');

-- CreateTable
CREATE TABLE "AiCompanion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Alex',
    "gender" "Gender" NOT NULL DEFAULT 'OTHER',
    "outfit" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCompanion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL,
    "companionId" TEXT NOT NULL,
    "role" "AiChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiCompanion_userId_key" ON "AiCompanion"("userId");

-- CreateIndex
CREATE INDEX "AiChatMessage_companionId_createdAt_idx" ON "AiChatMessage"("companionId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiCompanion" ADD CONSTRAINT "AiCompanion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "AiCompanion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
