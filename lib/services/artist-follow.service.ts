import { prisma } from "@/lib/prisma";

export class ArtistFollowNotFoundError extends Error {
  constructor(message = "Artist not found.") {
    super(message);
    this.name = "ArtistFollowNotFoundError";
  }
}

async function countArtistFollowers(artistId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "ArtistFollow"
    WHERE "artistId" = ${artistId}
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function isArtistFollowed(
  userId: string,
  artistSlug: string,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT af.id
    FROM "ArtistFollow" af
    INNER JOIN "Artist" a ON a.id = af."artistId"
    WHERE af."userId" = ${userId} AND a.slug = ${artistSlug}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function toggleArtistFollow(userId: string, artistSlug: string) {
  const artist = await prisma.artist.findUnique({
    where: { slug: artistSlug },
    select: { id: true },
  });
  if (!artist) throw new ArtistFollowNotFoundError();

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ArtistFollow"
    WHERE "userId" = ${userId} AND "artistId" = ${artist.id}
    LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      DELETE FROM "ArtistFollow" WHERE id = ${existing[0].id}
    `;
    const followerCount = await countArtistFollowers(artist.id);
    return { following: false, followerCount };
  }

  const followId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "ArtistFollow" (id, "userId", "artistId", "createdAt")
    VALUES (${followId}, ${userId}, ${artist.id}, NOW())
  `;
  const followerCount = await countArtistFollowers(artist.id);
  return { following: true, followerCount };
}

export async function getArtistFollowerPreview(artistSlug: string) {
  const artist = await prisma.artist.findUnique({
    where: { slug: artistSlug },
    select: { id: true, title: true },
  });

  if (!artist) {
    return {
      followerCount: 0,
      followers: [] as {
        id: string;
        name: string;
        handle: string;
        avatarColor: string;
        avatarUrl?: string;
      }[],
      summary: undefined as string | undefined,
    };
  }

  const [followerCount, recentFollows] = await Promise.all([
    countArtistFollowers(artist.id),
    prisma.$queryRaw<
      {
        handle: string;
        avatarColor: string;
        avatarUrl: string | null;
      }[]
    >`
      SELECT u.handle, u."avatarColor", u."avatarUrl"
      FROM "ArtistFollow" af
      INNER JOIN "User" u ON u.id = af."userId"
      WHERE af."artistId" = ${artist.id}
      ORDER BY af."createdAt" DESC
      LIMIT 3
    `,
  ]);

  const followers = recentFollows.map((row) => ({
    id: row.handle,
    name: row.handle,
    handle: row.handle,
    avatarColor: row.avatarColor,
    avatarUrl: row.avatarUrl ?? undefined,
  }));

  const visibleNames = followers.map((user) => user.name);
  const hiddenCount = Math.max(0, followerCount - visibleNames.length);

  let summary: string | undefined;
  if (followerCount === 0) {
    summary = `Be the first to follow ${artist.title}.`;
  } else if (hiddenCount > 0 && visibleNames.length > 0) {
    summary = `${visibleNames.join(", ")} and ${hiddenCount} more connection${hiddenCount === 1 ? "" : "s"} follow ${artist.title}.`;
  } else if (visibleNames.length > 0) {
    summary = `${visibleNames.join(", ")} follow${visibleNames.length === 1 ? "s" : ""} ${artist.title}.`;
  }

  return { followerCount, followers, summary };
}
