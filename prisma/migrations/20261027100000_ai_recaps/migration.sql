-- Cached AI "Catch me up" recaps (shared per title / stopping point / depth). Additive only.
CREATE TABLE "AiRecap" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "upTo" TEXT NOT NULL,
    "depth" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "grounding" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRecap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiRecap_contentId_upTo_depth_key" ON "AiRecap"("contentId", "upTo", "depth");

ALTER TABLE "AiRecap" ADD CONSTRAINT "AiRecap_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
