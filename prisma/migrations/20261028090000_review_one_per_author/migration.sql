-- One review per author per target.
-- Double-submits could slip past the app-level check before this, so first drop any
-- duplicates, keeping each author's most-liked (then earliest) review for that target.

DELETE FROM "Review" r
USING (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "authorId", "contentId" ORDER BY "likeCount" DESC, "createdAt" ASC, "id" ASC
  ) AS rn
  FROM "Review"
  WHERE "contentId" IS NOT NULL
) dup
WHERE r."id" = dup."id" AND dup.rn > 1;

DELETE FROM "Review" r
USING (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "authorId", "trackId" ORDER BY "likeCount" DESC, "createdAt" ASC, "id" ASC
  ) AS rn
  FROM "Review"
  WHERE "trackId" IS NOT NULL
) dup
WHERE r."id" = dup."id" AND dup.rn > 1;

DELETE FROM "Review" r
USING (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "authorId", "artistId" ORDER BY "likeCount" DESC, "createdAt" ASC, "id" ASC
  ) AS rn
  FROM "Review"
  WHERE "artistId" IS NOT NULL
) dup
WHERE r."id" = dup."id" AND dup.rn > 1;

DELETE FROM "Review" r
USING (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "authorId", "communityId" ORDER BY "likeCount" DESC, "createdAt" ASC, "id" ASC
  ) AS rn
  FROM "Review"
  WHERE "communityId" IS NOT NULL
) dup
WHERE r."id" = dup."id" AND dup.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_contentId_key" ON "Review"("authorId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_trackId_key" ON "Review"("authorId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_artistId_key" ON "Review"("authorId", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_communityId_key" ON "Review"("authorId", "communityId");
