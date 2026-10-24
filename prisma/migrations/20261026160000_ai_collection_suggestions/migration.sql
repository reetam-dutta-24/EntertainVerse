-- Weekly AI "smart collection" ideas built from behaviour. Additive only.
CREATE TABLE "AiCollectionSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "traitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemSlugs" JSONB NOT NULL DEFAULT '[]',
    "fromActivity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "weekKey" TEXT NOT NULL,
    "collectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCollectionSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiCollectionSuggestion_userId_weekKey_traitId_key" ON "AiCollectionSuggestion"("userId", "weekKey", "traitId");
CREATE INDEX "AiCollectionSuggestion_userId_weekKey_idx" ON "AiCollectionSuggestion"("userId", "weekKey");

ALTER TABLE "AiCollectionSuggestion" ADD CONSTRAINT "AiCollectionSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
