-- Reconcile the checked-in migrations with the existing optional-email schema.
-- IF NOT EXISTS also supports databases previously aligned with prisma db push.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
