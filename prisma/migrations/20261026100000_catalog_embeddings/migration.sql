-- Semantic vectors (Gemini embedding model) for the hybrid recommender. Additive only.
CREATE TABLE "CatalogEmbedding" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "vector" DOUBLE PRECISION[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogEmbedding_kind_itemId_key" ON "CatalogEmbedding"("kind", "itemId");
