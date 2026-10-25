-- User.role (PlatformRole) reached the schema through `prisma db push` and never got a
-- migration, so the next migration (admin roles) failed on an empty database.
-- Creates the enum as it was before that migration rewrote it. Idempotent: databases
-- that already have the type and column are left untouched.
DO $$
BEGIN
  IF to_regtype('"PlatformRole"') IS NULL THEN
    CREATE TYPE "PlatformRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "PlatformRole" NOT NULL DEFAULT 'USER';
