import type { PrismaClient } from "@prisma/client";
import { roundRating } from "@/lib/format-rating";
import {
  DETAILED_EPISODE_SLUGS,
  getDetailedNested,
} from "@/lib/seed/detailed-episodes";
import {
  REETAM_COLLECTION_SEEDS,
  REETAM_EMAIL,
  type CollectionSeed,
} from "@/lib/seed/collection-seeds";
import {
  GLOBAL_COLLECTION_SEEDS,
  GLOBAL_COMMUNITY_SEEDS,
} from "@/lib/seed/global-seeds";
import { ALL_OST_SEEDS } from "@/lib/seed/ost-seeds";
import type { ContentNestedSeed } from "@/lib/seed/helpers";

async function syncContentNested(
  prisma: PrismaClient,
  contentId: string,
  nested: ContentNestedSeed,
) {
  await prisma.$transaction([
    prisma.contentEpisode.deleteMany({ where: { contentId } }),
    prisma.contentSeason.deleteMany({ where: { contentId } }),
    prisma.contentCharacter.deleteMany({ where: { contentId } }),
  ]);

  const seasonIdByNumber = new Map<number, string>();
  for (const [index, season] of (nested.seasons ?? []).entries()) {
    const row = await prisma.contentSeason.create({
      data: {
        contentId,
        label: season.label,
        episodeCount: season.episodeCount,
        position: index,
      },
    });
    seasonIdByNumber.set(index + 1, row.id);
  }

  for (const [index, episode] of (nested.episodes ?? []).entries()) {
    await prisma.contentEpisode.create({
      data: {
        contentId,
        seasonId: seasonIdByNumber.get(episode.seasonNumber) ?? null,
        seasonNumber: episode.seasonNumber,
        number: episode.number,
        title: episode.title,
        duration: episode.duration ?? null,
        description: episode.description ?? null,
        thumbnailUrl: null,
        language: episode.language ?? null,
        rating: roundRating(episode.rating),
        position: index,
      },
    });
  }

  for (const [index, character] of (nested.characters ?? []).entries()) {
    await prisma.contentCharacter.create({
      data: {
        contentId,
        name: character.name,
        role: character.role ?? null,
        voiceActor: character.voiceActor ?? null,
        imageUrl: null,
        accent: character.accent ?? null,
        position: index,
      },
    });
  }
}

async function seedCollectionsFromSeeds(
  prisma: PrismaClient,
  ownerEmail: string,
  seeds: CollectionSeed[],
  contentSlugToId: Map<string, string>,
  trackSlugToId: Map<string, string>,
) {
  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail.toLowerCase() },
    select: { id: true },
  });
  if (!owner) return;

  for (const seed of seeds) {
    const collection = await prisma.collection.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        userId: owner.id,
        name: seed.name,
        description: seed.description,
        category: seed.category,
        genreLabels: seed.genreLabels,
        kind: seed.kind,
        visibility: seed.visibility,
        accent: seed.accent,
        imageUrl: null,
        favoriteCount: 0,
      },
      update: {
        name: seed.name,
        description: seed.description,
        category: seed.category,
        genreLabels: seed.genreLabels,
        kind: seed.kind,
        visibility: seed.visibility,
        accent: seed.accent,
        favoriteCount: 0,
      },
    });

    await prisma.collectionItem.deleteMany({ where: { collectionId: collection.id } });
    let position = 0;
    for (const slug of seed.items ?? []) {
      const contentId = contentSlugToId.get(slug);
      if (!contentId) continue;
      await prisma.collectionItem.create({
        data: { collectionId: collection.id, contentId, position: position++ },
      });
    }
    for (const slug of seed.tracks ?? []) {
      const trackId = trackSlugToId.get(slug);
      if (!trackId) continue;
      await prisma.collectionItem.create({
        data: { collectionId: collection.id, trackId, position: position++ },
      });
    }

    const itemCount = await prisma.collectionItem.count({
      where: { collectionId: collection.id },
    });
    const favoriteCount = await prisma.collectionFavorite.count({
      where: { collectionId: collection.id },
    });
    await prisma.collection.update({
      where: { id: collection.id },
      data: { itemCount, favoriteCount, updatedAt: new Date() },
    });
  }
}

async function seedReetamCollections(
  prisma: PrismaClient,
  userId: string,
  contentSlugToId: Map<string, string>,
  trackSlugToId: Map<string, string>,
) {
  await seedCollectionsFromSeeds(
    prisma,
    REETAM_EMAIL,
    REETAM_COLLECTION_SEEDS,
    contentSlugToId,
    trackSlugToId,
  );
}

async function seedReetamActivity(
  prisma: PrismaClient,
  userId: string,
  contentSlugToId: Map<string, string>,
  trackSlugToId: Map<string, string>,
  artistSlugToId: Map<string, string>,
) {
  const watchlistSlugs = [
    { slug: "death-note", status: "WATCHING" as const, priority: "HIGH" as const },
    { slug: "jujutsu-kaisen", status: "WATCHING" as const, priority: "NORMAL" as const },
    { slug: "money-heist", status: "PENDING" as const, priority: "NORMAL" as const },
    { slug: "alice-in-borderland", status: "COMPLETED" as const, priority: "NORMAL" as const },
    { slug: "inception", status: "COMPLETED" as const, priority: "NORMAL" as const },
  ];

  for (const entry of watchlistSlugs) {
    const contentId = contentSlugToId.get(entry.slug);
    if (!contentId) continue;
    await prisma.watchlistItem.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: {
        userId,
        contentId,
        status: entry.status,
        priority: entry.priority,
      },
      update: { status: entry.status, priority: entry.priority },
    });
  }

  const favoriteSlugs = [
    "death-note",
    "demon-slayer",
    "attack-on-titan",
    "parasite",
    "squid-game",
  ];
  for (const slug of favoriteSlugs) {
    const contentId = contentSlugToId.get(slug);
    if (!contentId) continue;
    await prisma.contentFavorite.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { userId, contentId },
      update: {},
    });
  }

  const listenSlugs = [
    "bts-dynamite",
    "twice-feel-special",
    "blackpink-pink-venom",
    "coldplay-yellow",
    "arijit-singh-kesariya",
    "the-weeknd-blinding-lights",
  ];
  for (const [index, slug] of listenSlugs.entries()) {
    const trackId = trackSlugToId.get(slug);
    if (!trackId) continue;
    for (let i = 0; i < 3 - (index % 2); i++) {
      await prisma.listenEvent.create({
        data: {
          userId,
          trackId,
          minutes: 3 + (index % 2),
          listenedAt: new Date(Date.now() - (index * 6 + i) * 86_400_000),
        },
      });
    }
  }

  const watchSlugs = ["death-note", "jujutsu-kaisen", "money-heist", "alice-in-borderland"];
  for (const [index, slug] of watchSlugs.entries()) {
    const contentId = contentSlugToId.get(slug);
    if (!contentId) continue;
    await prisma.watchEvent.create({
      data: {
        userId,
        contentId,
        minutes: 120 + index * 45,
        watchedAt: new Date(Date.now() - index * 72_000_000),
      },
    });
  }

  const artistSlugs = ["bts", "twice", "blackpink", "coldplay", "arijit-singh"];
  for (const slug of artistSlugs) {
    const artistId = artistSlugToId.get(slug);
    if (!artistId) continue;
    await prisma.artistFollow.upsert({
      where: { userId_artistId: { userId, artistId } },
      create: { userId, artistId },
      update: {},
    });
  }
}

async function fixCommunityMembership(prisma: PrismaClient) {
  const reetam = await prisma.user.findUnique({
    where: { email: REETAM_EMAIL.toLowerCase() },
    select: { id: true },
  });
  if (reetam) {
    await prisma.communityMember.deleteMany({ where: { userId: reetam.id } });
  }

  const aisha = await prisma.user.findUnique({
    where: { email: "aisha@entertainverse.local" },
    select: { id: true },
  });
  const vikram = await prisma.user.findUnique({
    where: { email: "vikram@entertainverse.local" },
    select: { id: true },
  });

  const communities = await prisma.community.findMany({ select: { id: true } });
  for (const community of communities) {
    if (aisha) {
      await prisma.communityMember.upsert({
        where: { userId_communityId: { userId: aisha.id, communityId: community.id } },
        create: { userId: aisha.id, communityId: community.id, role: "ADMIN" },
        update: { role: "ADMIN" },
      });
    }
    if (vikram) {
      await prisma.communityMember.upsert({
        where: { userId_communityId: { userId: vikram.id, communityId: community.id } },
        create: { userId: vikram.id, communityId: community.id, role: "MODERATOR" },
        update: { role: "MODERATOR" },
      });
    }

    const memberCount = await prisma.communityMember.count({
      where: { communityId: community.id },
    });
    await prisma.community.update({
      where: { id: community.id },
      data: { memberCount },
    });
  }
}

async function syncDetailedEpisodes(prisma: PrismaClient) {
  const slugRows = await prisma.content.findMany({
    where: { slug: { in: [...DETAILED_EPISODE_SLUGS] } },
    select: { id: true, slug: true },
  });

  for (const row of slugRows) {
    const nested = getDetailedNested(row.slug);
    if (!nested) continue;
    await syncContentNested(prisma, row.id, nested);
    await prisma.content.update({
      where: { id: row.id },
      data: {
        episodeCount: nested.episodes?.length ?? null,
        seasonCount: nested.seasons?.length ?? null,
      },
    });
  }

  await prisma.contentEpisode.deleteMany({
    where: {
      content: {
        slug: { notIn: [...DETAILED_EPISODE_SLUGS] },
        type: { not: "MOVIE" },
      },
    },
  });
}

async function seedGlobalCommunities(prisma: PrismaClient) {
  for (const seed of GLOBAL_COMMUNITY_SEEDS) {
    const owner = await prisma.user.findUnique({
      where: { email: seed.ownerEmail.toLowerCase() },
      select: { id: true },
    });
    if (!owner) continue;

    const community = await prisma.community.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        category: seed.category,
        visibility: seed.visibility,
        activityLevel: seed.activityLevel,
        accent: seed.accent,
        memberCount: 1,
      },
      update: {
        name: seed.name,
        description: seed.description,
        category: seed.category,
        visibility: seed.visibility,
        activityLevel: seed.activityLevel,
        accent: seed.accent,
      },
    });

    await prisma.communityMember.upsert({
      where: {
        userId_communityId: { userId: owner.id, communityId: community.id },
      },
      create: { userId: owner.id, communityId: community.id, role: "ADMIN" },
      update: { role: "ADMIN" },
    });

    for (const post of seed.posts ?? []) {
      const existing = await prisma.communityPost.findFirst({
        where: { communityId: community.id, title: post.title },
      });
      if (existing) continue;
      await prisma.communityPost.create({
        data: {
          communityId: community.id,
          authorId: owner.id,
          title: post.title,
          content: post.content,
          kind: "POST",
        },
      });
    }

    const [memberCount, postCount] = await Promise.all([
      prisma.communityMember.count({ where: { communityId: community.id } }),
      prisma.communityPost.count({ where: { communityId: community.id } }),
    ]);
    await prisma.community.update({
      where: { id: community.id },
      data: { memberCount, postCount, updatedAt: new Date() },
    });
  }
}

async function seedOstTracks(
  prisma: PrismaClient,
  contentSlugToId: Map<string, string>,
) {
  for (const [index, seed] of ALL_OST_SEEDS.entries()) {
    const contentId = contentSlugToId.get(seed.contentSlug);
    if (!contentId) continue;

    const track = await prisma.musicTrack.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        title: seed.title,
        artist: seed.artist,
        kind: "ost",
        source: seed.contentSlug.replace(/-/g, " "),
        album: seed.album ?? null,
        durationLabel: seed.duration,
        genres: seed.genres,
        language: seed.language ?? null,
        contentId,
        accent: "purple",
        trendingLabel: `Featured OST · ${seed.contentSlug}`,
        creditLabel: `By ${seed.artist}`,
      },
      update: {
        title: seed.title,
        artist: seed.artist,
        kind: "ost",
        album: seed.album ?? null,
        durationLabel: seed.duration,
        genres: seed.genres,
        language: seed.language ?? null,
        contentId,
      },
    });

    await prisma.contentFeaturedTrack.upsert({
      where: { contentId_trackId: { contentId, trackId: track.id } },
      create: { contentId, trackId: track.id, position: index % 20 },
      update: { position: index % 20 },
    });
  }
}

export async function runRecoverySeed(prisma: PrismaClient) {
  console.log("Running recovery seed (non-destructive)…\n");

  const reetam = await prisma.user.findUnique({
    where: { email: REETAM_EMAIL.toLowerCase() },
  });
  if (!reetam) {
    throw new Error(`User ${REETAM_EMAIL} not found. Run db:seed first.`);
  }

  const [contentRows, trackRows, artistRows] = await Promise.all([
    prisma.content.findMany({ select: { id: true, slug: true } }),
    prisma.musicTrack.findMany({ select: { id: true, slug: true } }),
    prisma.artist.findMany({ select: { id: true, slug: true } }),
  ]);

  const contentSlugToId = new Map(contentRows.map((row) => [row.slug, row.id]));
  const trackSlugToId = new Map(trackRows.map((row) => [row.slug, row.id]));
  const artistSlugToId = new Map(artistRows.map((row) => [row.slug, row.id]));

  await syncDetailedEpisodes(prisma);
  console.log(`Detailed episodes synced for: ${[...DETAILED_EPISODE_SLUGS].join(", ")}`);
  console.log("Removed generic episodes from all other titles.\n");

  await seedReetamCollections(prisma, reetam.id, contentSlugToId, trackSlugToId);
  console.log(`Collections upserted for ${REETAM_EMAIL}: ${REETAM_COLLECTION_SEEDS.length}`);

  await seedCollectionsFromSeeds(
    prisma,
    "aisha@entertainverse.local",
    GLOBAL_COLLECTION_SEEDS.filter((s) => s.ownerEmail.includes("aisha")),
    contentSlugToId,
    trackSlugToId,
  );
  await seedCollectionsFromSeeds(
    prisma,
    "vikram@entertainverse.local",
    GLOBAL_COLLECTION_SEEDS.filter((s) => s.ownerEmail.includes("vikram")),
    contentSlugToId,
    trackSlugToId,
  );
  console.log(`Global public collections upserted: ${GLOBAL_COLLECTION_SEEDS.length}`);

  await seedOstTracks(prisma, contentSlugToId);
  console.log(`OST tracks upserted: ${ALL_OST_SEEDS.length}`);

  await seedGlobalCommunities(prisma);
  console.log(`Global communities upserted: ${GLOBAL_COMMUNITY_SEEDS.length}`);

  await seedReetamActivity(prisma, reetam.id, contentSlugToId, trackSlugToId, artistSlugToId);
  console.log("Reetam watchlist, favorites, listen/watch events, and artist follows seeded.\n");

  await fixCommunityMembership(prisma);
  console.log("Reetam removed from all communities; Aisha/Vikram remain as members.\n");

  console.log("Recovery seed complete.");
}
