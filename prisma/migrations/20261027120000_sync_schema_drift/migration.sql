-- Schema changes applied with `prisma db push` that never got a migration. A database
-- built from migrations alone (CI, a fresh deploy) was missing them. Idempotent: a
-- no-op on databases that already match the schema.

-- Collection: kind / category / genre labels
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Mixed';
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "genreLabels" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'content';

-- @updatedAt and required columns carry no database default in the schema
ALTER TABLE "CommunityChatMessage" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CommunityPost" ALTER COLUMN "title" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
