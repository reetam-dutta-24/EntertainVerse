import { prisma } from "@/lib/prisma";
import { invalidateUser } from "@/lib/cache/server-cache";

export class FavoriteNotFoundError extends Error {
  constructor(message = "Item not found.") {
    super(message);
    this.name = "FavoriteNotFoundError";
  }
}

export async function isCollectionFavorited(
  userId: string,
  collectionSlug: string,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT cf.id
    FROM "CollectionFavorite" cf
    INNER JOIN "Collection" c ON c.id = cf."collectionId"
    WHERE cf."userId" = ${userId} AND c.slug = ${collectionSlug}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function isContentFavorited(
  userId: string,
  contentSlug: string,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT cf.id
    FROM "ContentFavorite" cf
    INNER JOIN "Content" c ON c.id = cf."contentId"
    WHERE cf."userId" = ${userId} AND c.slug = ${contentSlug}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function toggleCollectionFavorite(userId: string, collectionSlug: string) {
  const collection = await prisma.collection.findUnique({
    where: { slug: collectionSlug },
    select: { id: true, favoriteCount: true },
  });
  if (!collection) throw new FavoriteNotFoundError("Collection not found.");

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "CollectionFavorite"
    WHERE "userId" = ${userId} AND "collectionId" = ${collection.id}
    LIMIT 1
  `;

  if (existing.length > 0) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM "CollectionFavorite" WHERE id = ${existing[0].id}
      `;
      return tx.collection.update({
        where: { id: collection.id },
        data: { favoriteCount: { decrement: 1 } },
        select: { favoriteCount: true },
      });
    });
    invalidateUser(userId);
    return {
      favorited: false,
      favoriteCount: Math.max(0, updated.favoriteCount),
    };
  }

  const favoriteId = crypto.randomUUID();
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "CollectionFavorite" (id, "userId", "collectionId", "createdAt")
      VALUES (${favoriteId}, ${userId}, ${collection.id}, NOW())
    `;
    return tx.collection.update({
      where: { id: collection.id },
      data: { favoriteCount: { increment: 1 } },
      select: { favoriteCount: true },
    });
  });

  invalidateUser(userId);

  return { favorited: true, favoriteCount: updated.favoriteCount };
}

export async function listUserFavoriteContent(userId: string) {
  const rows = await prisma.contentFavorite.findMany({
    where: { userId },
    include: {
      content: {
        include: {
          genres: { include: { genre: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => row.content);
}

export async function listUserFavoriteTracks(userId: string) {
  const rows = await prisma.trackFavorite.findMany({
    where: { userId },
    include: {
      track: {
        include: { artistRef: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => row.track);
}

export async function listUserFavoriteArtists(userId: string) {
  const rows = await prisma.artistFavorite.findMany({
    where: { userId },
    include: { artist: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => row.artist);
}

export async function listUserFavoriteCollections(userId: string) {
  const rows = await prisma.collectionFavorite.findMany({
    where: { userId },
    include: { collection: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => row.collection);
}

export async function getContentFavoriteCount(contentId: string): Promise<number> {
  return prisma.contentFavorite.count({ where: { contentId } });
}

export async function toggleContentFavorite(userId: string, contentSlug: string) {
  const content = await prisma.content.findUnique({
    where: { slug: contentSlug },
    select: { id: true },
  });
  if (!content) throw new FavoriteNotFoundError("Content not found.");

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ContentFavorite"
    WHERE "userId" = ${userId} AND "contentId" = ${content.id}
    LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      DELETE FROM "ContentFavorite" WHERE id = ${existing[0].id}
    `;
    const favoriteCount = await getContentFavoriteCount(content.id);
    invalidateUser(userId);
    return { favorited: false, favoriteCount };
  }

  const favoriteId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "ContentFavorite" (id, "userId", "contentId", "createdAt")
    VALUES (${favoriteId}, ${userId}, ${content.id}, NOW())
  `;
  const favoriteCount = await getContentFavoriteCount(content.id);
  invalidateUser(userId);
  return { favorited: true, favoriteCount };
}

export async function isTrackFavorited(
  userId: string,
  trackSlug: string,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT tf.id
    FROM "TrackFavorite" tf
    INNER JOIN "MusicTrack" t ON t.id = tf."trackId"
    WHERE tf."userId" = ${userId} AND t.slug = ${trackSlug}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function toggleTrackFavorite(userId: string, trackSlug: string) {
  const track = await prisma.musicTrack.findUnique({
    where: { slug: trackSlug },
    select: { id: true },
  });
  if (!track) throw new FavoriteNotFoundError("Track not found.");

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "TrackFavorite"
    WHERE "userId" = ${userId} AND "trackId" = ${track.id}
    LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      DELETE FROM "TrackFavorite" WHERE id = ${existing[0].id}
    `;
    invalidateUser(userId);
    return { favorited: false };
  }

  const favoriteId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "TrackFavorite" (id, "userId", "trackId", "createdAt")
    VALUES (${favoriteId}, ${userId}, ${track.id}, NOW())
  `;
  invalidateUser(userId);
  return { favorited: true };
}

export async function isArtistFavorited(
  userId: string,
  artistSlug: string,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT af.id
    FROM "ArtistFavorite" af
    INNER JOIN "Artist" a ON a.id = af."artistId"
    WHERE af."userId" = ${userId} AND a.slug = ${artistSlug}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function toggleArtistFavorite(userId: string, artistSlug: string) {
  const artist = await prisma.artist.findUnique({
    where: { slug: artistSlug },
    select: { id: true },
  });
  if (!artist) throw new FavoriteNotFoundError("Artist not found.");

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ArtistFavorite"
    WHERE "userId" = ${userId} AND "artistId" = ${artist.id}
    LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      DELETE FROM "ArtistFavorite" WHERE id = ${existing[0].id}
    `;
    invalidateUser(userId);
    return { favorited: false };
  }

  const favoriteId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "ArtistFavorite" (id, "userId", "artistId", "createdAt")
    VALUES (${favoriteId}, ${userId}, ${artist.id}, NOW())
  `;
  invalidateUser(userId);
  return { favorited: true };
}
