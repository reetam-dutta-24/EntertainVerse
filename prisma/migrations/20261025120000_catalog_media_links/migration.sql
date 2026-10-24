-- Legal media + links for catalog items (additive only).
ALTER TABLE "Content" ADD COLUMN "trailerUrl" TEXT,
  ADD COLUMN "tmdbId" INTEGER,
  ADD COLUMN "tmdbKind" TEXT;

ALTER TABLE "MusicTrack" ADD COLUMN "previewUrl" TEXT,
  ADD COLUMN "listenLinks" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Artist" ADD COLUMN "listenLinks" JSONB NOT NULL DEFAULT '[]';
