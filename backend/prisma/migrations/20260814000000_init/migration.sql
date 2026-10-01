-- Add Supabase auth ID to User (idempotent — migrations 1-3 already created all other tables/types)
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseId_key" ON "User"("supabaseId");
