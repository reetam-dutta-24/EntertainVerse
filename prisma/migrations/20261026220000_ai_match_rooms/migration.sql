-- AI Match rooms: broadcast invites with reach, capacity, expiry and popup tracking. Additive only.
ALTER TABLE "MatchCircle" ADD COLUMN "topic" TEXT,
ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'world',
ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "invitedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MatchCircle" ALTER COLUMN "status" SET DEFAULT 'OPEN';
UPDATE "MatchCircle" SET "status" = 'OPEN' WHERE "status" IN ('FORMING', 'ACTIVE');

ALTER TABLE "MatchCircleMember" ADD COLUMN "seenAt" TIMESTAMP(3);
