import bcrypt from "bcryptjs";
import { PrismaClient, PlatformRole, type Prisma } from "@prisma/client";
import {
  buildWatchlistForUser,
  COLLECTION_SEEDS,
  COMMUNITY_SEEDS,
  CONTENT_ITEMS,
  ARTIST_ITEMS,
  MUSIC_ITEMS,
  USER_SEEDS,
  VOICE_ACTORS,
} from "../lib/seed/generate-catalog";
import { CONTENT_NESTED } from "../lib/seed/content-nested";
import {
  generateMovieNested,
  isMovieType,
  normalizeContentGenre,
  type CatalogReviewSeed,
  type ContentNestedSeed,
  type ContentSeedBase,
} from "../lib/seed/helpers";
import { NOTIFICATION_SEEDS } from "../lib/seed/notifications";
import { seedAnalyticsEventsForUser } from "../lib/seed/analytics-events";
import { wipeDatabase } from "../lib/seed/wipe-database";
import { getDetailedNested } from "../lib/seed/detailed-episodes";
import { runRecoverySeed } from "../lib/seed/recovery-seed";
import { roundRating } from "../lib/format-rating";
import { syncNotificationsForUser } from "../lib/services/notification.service";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

const MEDIA_MAP = {
  anime: "ANIME",
  show: "SHOW",
  movie: "MOVIE",
  documentary: "DOCUMENTARY",
  kdrama: "KDRAMA",
} as const;

const PLATFORM_ADMINS = [
  { email: "admin@entertainverse.local", password: "Admin123!", name: "EntertainVerse Super Admin", handle: "entertainverse_admin", role: PlatformRole.SUPER_ADMIN },
  { email: "content@entertainverse.local", password: "Content123!", name: "Content Admin", handle: "content_admin", role: PlatformRole.CONTENT_ADMIN },
  { email: "music@entertainverse.local", password: "Music123!", name: "Music Admin", handle: "music_admin", role: PlatformRole.MUSIC_ADMIN },
  { email: "artist@entertainverse.local", password: "Artist123!", name: "Artist Admin", handle: "artist_admin", role: PlatformRole.ARTIST_ADMIN },
] as const;

async function seedAdminUsers() {
  for (const account of PLATFORM_ADMINS) {
    const email = account.email.toLowerCase();
    const passwordHash = await bcrypt.hash(account.password, BCRYPT_ROUNDS);
    const admin = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        handle: account.handle,
        name: account.name,
        passwordHash,
        role: account.role,
        onboardingCompletedAt: new Date(),
        aiTasteScore: 100,
        preferences: { create: {} },
      },
      update: { role: account.role, name: account.name, passwordHash, handle: account.handle },
      select: { email: true, handle: true, role: true },
    });
    console.log(`Admin ready: ${admin.email} (@${admin.handle}) [${admin.role}]`);
  }
  console.log("\nAdmin credentials:");
  for (const account of PLATFORM_ADMINS) {
    console.log(`  ${account.role}: ${account.email} / ${account.password}`);
  }
}

async function upsertGenres(slugs: string[]) {
  const unique = [...new Set(slugs.map(normalizeContentGenre))];
  return Promise.all(
    unique.map((slug) =>
      prisma.genre.upsert({
        where: { label: slug },
        create: { label: slug },
        update: {},
      }),
    ),
  );
}

function resolveNested(item: ContentSeedBase, index: number): ContentNestedSeed {
  const detailed = getDetailedNested(item.slug);
  if (detailed) return detailed;

  const custom = CONTENT_NESTED[item.slug as keyof typeof CONTENT_NESTED];
  if (custom) return custom;

  if (isMovieType(item.type)) {
    return generateMovieNested(item.slug, item.title, item.episodeDuration ?? "Full Movie");
  }

  return {
    seasons: [{ label: item.seasonLabel ?? "Season 1", episodeCount: item.episodeCount ?? 12 }],
    characters: [
      { name: `${item.title} Lead`, role: "Protagonist", voiceActor: pick(VOICE_ACTORS, index), accent: item.accent ?? "blue" },
      { name: `${item.title} Rival`, role: "Supporting", voiceActor: pick(VOICE_ACTORS, index + 3), accent: "purple" },
    ],
    relatedSlugs: CONTENT_ITEMS.filter((c) => c.slug !== item.slug && c.type === item.type)
      .slice(index % 10, (index % 10) + 4)
      .map((c) => c.slug),
    catalogReviews: [
      {
        authorName: "EntertainVerse Curator",
        authorAvatarColor: "#ff00cc",
        rating: roundRating(item.rating) ?? 8,
        body: `${item.title} is a standout pick on EntertainVerse.`,
        accent: item.accent,
        likeCount: 12,
        headline: `Why ${item.title} belongs on your list`,
      },
    ],
  };
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length]!;
}

async function syncCatalogReviews(
  reviews: CatalogReviewSeed[],
  link: { contentId?: string; trackId?: string; artistId?: string },
) {
  const where = link.contentId
    ? { contentId: link.contentId }
    : link.trackId
      ? { trackId: link.trackId }
      : { artistId: link.artistId! };

  await prisma.catalogReview.deleteMany({ where });
  for (const [index, review] of reviews.entries()) {
    await prisma.catalogReview.create({
      data: {
        ...link,
        authorName: review.authorName,
        authorAvatarColor: review.authorAvatarColor ?? "#ff00cc",
        rating: roundRating(review.rating) ?? 0,
        headline: review.headline ?? null,
        body: review.body,
        accent: review.accent ?? null,
        likeCount: review.likeCount ?? 0,
        position: index,
      },
    });
  }
}

async function syncContentNested(contentId: string, slug: string, nested: ContentNestedSeed) {
  await prisma.$transaction([
    prisma.contentEpisode.deleteMany({ where: { contentId } }),
    prisma.contentSeason.deleteMany({ where: { contentId } }),
    prisma.contentCharacter.deleteMany({ where: { contentId } }),
    prisma.contentFeaturedTrack.deleteMany({ where: { contentId } }),
    prisma.contentRelated.deleteMany({ where: { contentId } }),
    prisma.catalogReview.deleteMany({ where: { contentId } }),
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
    const num = index + 1;
    seasonIdByNumber.set(num, row.id);
  }

  for (const [index, ep] of (nested.episodes ?? []).entries()) {
    await prisma.contentEpisode.create({
      data: {
        contentId,
        seasonId: seasonIdByNumber.get(ep.seasonNumber) ?? null,
        seasonNumber: ep.seasonNumber,
        number: ep.number,
        title: ep.title,
        duration: ep.duration ?? null,
        description: ep.description ?? null,
        thumbnailUrl: ep.thumbnailUrl ?? null,
        language: ep.language ?? null,
        rating: roundRating(ep.rating),
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
        imageUrl: character.imageUrl ?? null,
        accent: character.accent ?? null,
        position: index,
      },
    });
  }

  if (nested.catalogReviews?.length) {
    await syncCatalogReviews(nested.catalogReviews, { contentId });
  }
}

async function linkContentRelations(
  contentId: string,
  slug: string,
  nested: ContentNestedSeed,
  slugToId: Map<string, string>,
  trackSlugToId: Map<string, string>,
) {
  for (const [index, relatedSlug] of (nested.relatedSlugs ?? []).entries()) {
    const relatedId = slugToId.get(relatedSlug);
    if (!relatedId || relatedId === contentId) continue;
    await prisma.contentRelated.upsert({
      where: { contentId_relatedId: { contentId, relatedId } },
      create: { contentId, relatedId, position: index },
      update: { position: index },
    });
  }

  for (const [index, trackSlug] of (nested.featuredTrackSlugs ?? []).entries()) {
    const trackId = trackSlugToId.get(trackSlug);
    if (!trackId) continue;
    await prisma.contentFeaturedTrack.upsert({
      where: { contentId_trackId: { contentId, trackId } },
      create: { contentId, trackId, position: index },
      update: { position: index },
    });
  }
}

async function seedContent() {
  let created = 0;
  const slugToId = new Map<string, string>();

  for (const [index, item] of CONTENT_ITEMS.entries()) {
    const genreRows = await upsertGenres(item.genreLabels);
    const nested = resolveNested(item, index);
    const isMovie = isMovieType(item.type);

    const data = {
      title: item.title,
      nativeTitle: item.nativeTitle ?? null,
      type: MEDIA_MAP[item.type],
      description: item.description ?? null,
      synopsis: item.synopsis ?? item.description ?? null,
      imageUrl: item.imageUrl ?? null,
      backdropUrl: item.backdropUrl ?? null,
      rating: roundRating(item.rating),
      year: item.year ?? null,
      meta: item.meta ?? null,
      accent: item.accent ?? null,
      trendingLabel: item.trendingLabel ?? `Trending on EntertainVerse · ${item.type.toUpperCase()}`,
      creditLabel: item.creditLabel ?? null,
      highlightTags: item.highlightTags ?? [],
      studio: item.studio ?? null,
      director: item.director ?? null,
      composer: item.composer ?? null,
      originalAuthor: item.originalAuthor ?? null,
      sourceMaterial: item.sourceMaterial ?? null,
      producers: item.producers ?? null,
      network: item.network ?? null,
      country: item.country ?? null,
      status: item.status ?? null,
      ageRating: item.ageRating ?? null,
      imdbRating: roundRating(item.imdbRating),
      malScore: roundRating(item.malScore),
      airedFrom: item.airedFrom ?? null,
      airedTo: item.airedTo ?? null,
      broadcast: item.broadcast ?? null,
      airingDay: item.airingDay ?? null,
      lastUpdate: item.lastUpdate ?? null,
      episodeDuration: item.episodeDuration ?? (isMovie ? "Full Movie" : "24 Min"),
      languages: item.languages ?? ["japanese"],
      seasonCount: isMovie ? null : (item.seasonCount ?? nested.seasons?.length ?? null),
      episodeCount: isMovie ? null : (item.episodeCount ?? nested.episodes?.length ?? null),
      seasonLabel: isMovie ? null : (item.seasonLabel ?? nested.seasons?.[0]?.label ?? null),
    };

    const content = await prisma.content.create({
      data: { slug: item.slug, ...data },
    });

    slugToId.set(item.slug, content.id);

    await prisma.contentGenre.deleteMany({ where: { contentId: content.id } });
    await prisma.contentGenre.createMany({
      data: genreRows.map((genre) => ({ contentId: content.id, genreId: genre.id })),
      skipDuplicates: true,
    });

    await syncContentNested(content.id, item.slug, nested);

    created += 1;
  }

  console.log(`Content seed: ${created} created (${CONTENT_ITEMS.length} total).`);
  return slugToId;
}

async function seedArtists() {
  let count = 0;
  const slugToId = new Map<string, string>();

  for (const item of ARTIST_ITEMS) {
    const data = {
      title: item.title,
      nativeTitle: item.nativeTitle ?? null,
      synopsis: item.synopsis ?? null,
      imageUrl: item.imageUrl ?? null,
      accent: item.accent ?? null,
      rating: roundRating(item.rating),
      rankLeft: item.rankLeft ?? null,
      rankRight: item.rankRight ?? null,
      primaryTags: item.primaryTags ?? [],
      languages: item.languages,
      genres: item.genreLabels,
      label: item.label ?? null,
      debutYear: item.debutYear ?? null,
      isGroup: item.isGroup ?? false,
    } as unknown as Omit<Prisma.ArtistUncheckedCreateInput, "slug">;

    const artist = await prisma.artist.create({
      data: { slug: item.slug, ...data },
    });

    slugToId.set(item.slug, artist.id);
    count += 1;

    await prisma.artistMember.deleteMany({ where: { artistId: artist.id } });
    if (item.isGroup && item.members?.length) {
      for (const [index, member] of item.members.entries()) {
        await prisma.artistMember.create({
          data: { artistId: artist.id, name: member.name, role: member.role ?? null, position: index },
        });
      }
    }

    await prisma.catalogReview.deleteMany({ where: { artistId: artist.id } });
    if (item.catalogReviews?.length) {
      await syncCatalogReviews(item.catalogReviews, { artistId: artist.id });
    }
  }

  console.log(`Artist seed: ${count} artists upserted.`);
  return slugToId;
}

async function seedMusic(
  artistSlugToId: Map<string, string>,
  contentSlugToId: Map<string, string>,
) {
  let count = 0;
  const trackSlugToId = new Map<string, string>();

  for (const item of MUSIC_ITEMS) {
    const artistId = item.artistSlug ? artistSlugToId.get(item.artistSlug) ?? null : null;
    const contentId = item.contentSlug ? contentSlugToId.get(item.contentSlug) ?? null : null;

    const data = {
      title: item.title,
      nativeTitle: item.nativeTitle ?? null,
      artist: item.artist,
      kind: item.kind,
      description: item.description ?? null,
      lyrics: item.lyrics ?? null,
      source: item.source ?? null,
      album: item.album ?? null,
      language: item.language ?? null,
      genres: item.genreLabels,
      rating: roundRating(item.rating),
      year: item.year ?? null,
      durationLabel: item.durationLabel ?? null,
      durationSeconds: item.durationSeconds ?? null,
      imageUrl: item.imageUrl ?? null,
      backdropUrl: item.backdropUrl ?? item.imageUrl ?? null,
      accent: item.accent ?? null,
      trendingLabel: item.trendingLabel ?? `Trending on EntertainVerse · ${item.kind.toUpperCase()}`,
      creditLabel: item.creditLabel ?? `By ${item.artist}`,
      featuredRank: item.featuredRank ?? null,
      artistId,
      contentId,
    } as unknown as Omit<Prisma.MusicTrackUncheckedCreateInput, "slug">;

    const track = await prisma.musicTrack.create({
      data: { slug: item.slug, ...data },
    });

    trackSlugToId.set(item.slug, track.id);
    count += 1;

    await prisma.catalogReview.deleteMany({ where: { trackId: track.id } });
    if (item.catalogReviews?.length) {
      await syncCatalogReviews(item.catalogReviews, { trackId: track.id });
    }
  }

  console.log(`Music seed: ${count} tracks upserted.`);
  return trackSlugToId;
}

async function linkAllContentRelations(
  contentSlugToId: Map<string, string>,
  trackSlugToId: Map<string, string>,
) {
  for (const [index, item] of CONTENT_ITEMS.entries()) {
    const contentId = contentSlugToId.get(item.slug);
    if (!contentId) continue;
    const nested = resolveNested(item, index);
    const featuredTrackSlugs = MUSIC_ITEMS
      .filter((track) => track.contentSlug === item.slug)
      .slice(0, 5)
      .map((track) => track.slug);
    await linkContentRelations(
      contentId,
      item.slug,
      { ...nested, featuredTrackSlugs },
      contentSlugToId,
      trackSlugToId,
    );
  }
  console.log("Content relations linked (related titles + featured OSTs).");
}

async function seedAllUsersAndSocial(
  contentSlugToId: Map<string, string>,
  trackSlugToId: Map<string, string>,
) {
  const emailToUserId = new Map<string, string>();

  for (const [index, userSeed] of USER_SEEDS.entries()) {
    const passwordHash = await bcrypt.hash(userSeed.password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: userSeed.email.toLowerCase(),
        handle: userSeed.handle,
        name: userSeed.name,
        passwordHash,
        avatarColor: userSeed.avatarColor,
        bio: userSeed.bio,
        location: userSeed.location,
        aiTasteScore: userSeed.aiTasteScore,
        onboardingCompletedAt: new Date(),
        preferences: { create: {} },
        tasteProfile: {
          create: {
            tasteScore: userSeed.aiTasteScore,
            summaryChips: ["Anime", "Music", "Community"],
            selections: {
              contentTypes: ["Anime", "Movies"],
              genres: ["Action", "Drama", "Fantasy"],
              musicTastes: ["J-Pop", "K-Pop", "OST"],
            },
          },
        },
      },
    });
    emailToUserId.set(userSeed.email.toLowerCase(), user.id);

    const watchlist = buildWatchlistForUser(index, CONTENT_ITEMS);
    for (const item of watchlist) {
      const contentId = contentSlugToId.get(item.slug);
      if (!contentId) continue;
      await prisma.watchlistItem.create({
        data: {
          userId: user.id,
          contentId,
          priority: item.priority,
          status: item.status,
        },
      });
    }

    if (index === 0) {
      await syncNotificationsForUser(
        user.id,
        NOTIFICATION_SEEDS.map((seed) => ({
          userId: user.id,
          title: seed.title,
          category: seed.category,
          description: seed.description,
          imageUrl: seed.imageUrl,
          href: seed.href,
          read: seed.read,
          createdAt: new Date(Date.now() - seed.minutesAgo * 60_000),
        })),
      );
      await seedAnalyticsEventsForUser(user.id, contentSlugToId, trackSlugToId);
    }
  }

  for (const collectionSeed of COLLECTION_SEEDS) {
    const userId = emailToUserId.get(collectionSeed.ownerEmail.toLowerCase());
    if (!userId) continue;

    const collection = await prisma.collection.create({
      data: {
        slug: collectionSeed.slug,
        userId,
        name: collectionSeed.name,
        description: collectionSeed.description,
        category: collectionSeed.category,
        genreLabels: collectionSeed.genreLabels,
        kind: collectionSeed.kind,
        visibility: collectionSeed.visibility,
        accent: collectionSeed.accent,
        imageUrl: null,
        favoriteCount: collectionSeed.favoriteCount,
      },
    });

    let position = 0;
    for (const slug of collectionSeed.items ?? []) {
      const contentId = contentSlugToId.get(slug);
      if (!contentId) continue;
      await prisma.collectionItem.create({
        data: { collectionId: collection.id, contentId, position: position++ },
      });
    }
    for (const slug of collectionSeed.tracks ?? []) {
      const trackId = trackSlugToId.get(slug);
      if (!trackId) continue;
      await prisma.collectionItem.create({
        data: { collectionId: collection.id, trackId, position: position++ },
      });
    }
    const itemCount = await prisma.collectionItem.count({
      where: { collectionId: collection.id },
    });
    await prisma.collection.update({
      where: { id: collection.id },
      data: { itemCount },
    });
  }

  for (const [cIndex, communitySeed] of COMMUNITY_SEEDS.entries()) {
    const community = await prisma.community.create({
      data: {
        slug: communitySeed.slug,
        name: communitySeed.name,
        category: communitySeed.category,
        description: communitySeed.description,
        visibility: communitySeed.visibility,
        activityLevel: communitySeed.activityLevel,
        accent: communitySeed.accent,
        imageUrl: null,
        wallpaperUrl: null,
      },
    });

    const memberEmails = USER_SEEDS.slice(1).map((user) => user.email.toLowerCase());
    for (const [mIndex, email] of memberEmails.entries()) {
      const userId = emailToUserId.get(email);
      if (!userId) continue;
      await prisma.communityMember.create({
        data: {
          userId,
          communityId: community.id,
          role: mIndex === 0 ? "ADMIN" : mIndex === 1 ? "MODERATOR" : "MEMBER",
        },
      });
    }

    for (const postSeed of communitySeed.posts) {
      const authorId = emailToUserId.get(postSeed.authorEmail.toLowerCase());
      if (!authorId) continue;
      await prisma.communityPost.create({
        data: {
          communityId: community.id,
          authorId,
          title: postSeed.title,
          content: postSeed.content,
          imageUrl: null,
          kind: postSeed.kind ?? "POST",
          likeCount: postSeed.likeCount,
          commentCount: postSeed.commentCount,
          shareCount: postSeed.shareCount,
        },
      });
    }

    const [memberCount, postCount] = await Promise.all([
      prisma.communityMember.count({ where: { communityId: community.id } }),
      prisma.communityPost.count({ where: { communityId: community.id } }),
    ]);
    await prisma.community.update({
      where: { id: community.id },
      data: { memberCount, postCount },
    });
  }

  console.log(`Users seeded: ${USER_SEEDS.length}`);
  console.log(`Collections seeded: ${COLLECTION_SEEDS.length}`);
  console.log(`Communities seeded: ${COMMUNITY_SEEDS.length}`);
  console.log(`Primary login: ${USER_SEEDS[0]!.email} / ${USER_SEEDS[0]!.password}`);
}

async function main() {
  const shouldWipe =
    process.env.SEED_WIPE === "1" ||
    process.env.SEED_WIPE === "true" ||
    process.argv.includes("--wipe");

  if (shouldWipe) {
    console.log("⚠️  SEED_WIPE enabled — deleting ALL application data…");
    await wipeDatabase(prisma);
    console.log("Database wiped.\n");
  } else {
    console.log(
      "Non-destructive seed (existing data kept). To wipe first, run: npm run db:reset\n",
    );
  }

  console.log("Seeding EntertainVerse catalog…\n");
  await seedAdminUsers();
  console.log("");
  const contentSlugToId = await seedContent();
  const artistSlugToId = await seedArtists();
  const trackSlugToId = await seedMusic(artistSlugToId, contentSlugToId);
  await linkAllContentRelations(contentSlugToId, trackSlugToId);
  await seedAllUsersAndSocial(contentSlugToId, trackSlugToId);
  await runRecoverySeed(prisma);
  console.log("\nSeed complete.");
  console.log(`  ${CONTENT_ITEMS.length} content titles`);
  console.log(`  ${ARTIST_ITEMS.length} artists`);
  console.log(`  ${MUSIC_ITEMS.length} music tracks`);
  console.log(`  ${USER_SEEDS.length} users (+ ${PLATFORM_ADMINS.length} admins)`);
  console.log(`  ${COMMUNITY_SEEDS.length} communities`);
  console.log(`  ${COLLECTION_SEEDS.length} collections`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
