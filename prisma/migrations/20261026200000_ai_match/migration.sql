-- AI Match: opt-in profiles and taste circles. Additive only.
CREATE TABLE "MatchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scope" TEXT NOT NULL DEFAULT 'world',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "country" TEXT,
    "intro" TEXT,
    "groupSize" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchCircle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vibe" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FORMING',
    "communityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchCircle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchCircleMember" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "matchScore" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchCircleMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchProfile_userId_key" ON "MatchProfile"("userId");
CREATE UNIQUE INDEX "MatchCircle_communityId_key" ON "MatchCircle"("communityId");
CREATE UNIQUE INDEX "MatchCircleMember_circleId_userId_key" ON "MatchCircleMember"("circleId", "userId");
CREATE INDEX "MatchCircleMember_userId_status_idx" ON "MatchCircleMember"("userId", "status");

ALTER TABLE "MatchProfile" ADD CONSTRAINT "MatchProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchCircleMember" ADD CONSTRAINT "MatchCircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "MatchCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchCircleMember" ADD CONSTRAINT "MatchCircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
