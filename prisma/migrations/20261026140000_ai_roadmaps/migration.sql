-- AI roadmaps (ordered, time-budgeted watch/listen plans). Additive only.
CREATE TABLE "AiRoadmap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "analysis" JSONB NOT NULL DEFAULT '{}',
    "weeklyHours" INTEGER,
    "aiWritten" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRoadmap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiRoadmapStep" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "focus" TEXT NOT NULL DEFAULT '',
    "why" TEXT NOT NULL,
    "estMinutes" INTEGER NOT NULL DEFAULT 0,
    "week" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progressMinutes" INTEGER NOT NULL DEFAULT 0,
    "replacedTitle" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),

    CONSTRAINT "AiRoadmapStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiRoadmap_userId_mode_status_idx" ON "AiRoadmap"("userId", "mode", "status");
CREATE INDEX "AiRoadmapStep_roadmapId_position_idx" ON "AiRoadmapStep"("roadmapId", "position");

ALTER TABLE "AiRoadmap" ADD CONSTRAINT "AiRoadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiRoadmapStep" ADD CONSTRAINT "AiRoadmapStep_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "AiRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
