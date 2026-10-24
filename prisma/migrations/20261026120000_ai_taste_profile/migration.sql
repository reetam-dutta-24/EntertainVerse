-- What the AI recommender knows about a user (answers, vectors, controls). Additive only.
CREATE TABLE "AiTasteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learnFromActivity" BOOLEAN NOT NULL DEFAULT true,
    "watch" JSONB NOT NULL DEFAULT '{}',
    "listen" JSONB NOT NULL DEFAULT '{}',
    "watchVector" DOUBLE PRECISION[],
    "listenVector" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTasteProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiTasteProfile_userId_key" ON "AiTasteProfile"("userId");

ALTER TABLE "AiTasteProfile" ADD CONSTRAINT "AiTasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
