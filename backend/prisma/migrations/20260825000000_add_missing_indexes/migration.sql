-- Both queries these support already ran on every matchmaking attempt and
-- every "my rooms" fetch without a supporting index (only the composite
-- unique index covered the paired-lookup case, not a lookup on this column
-- alone).
CREATE INDEX IF NOT EXISTS "RoomMember_userId_idx" ON "RoomMember"("userId");
CREATE INDEX IF NOT EXISTS "Block_blockedId_idx" ON "Block"("blockedId");
