-- DropIndex
DROP INDEX IF EXISTS "users_email_key";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
