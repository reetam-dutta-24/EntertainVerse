import type { Collection, Community, ContentDetail, MusicTrack, Review, UserSummary } from "@/types";
import { buildSongReferenceUrl } from "@/lib/content-reference-url";
import { normalizeSongSlug } from "@/lib/song-routes";
import { mapTrackRecordToSongDetail } from "@/lib/mappers/song-detail.mapper";
import { mapArtistToContentItem } from "@/lib/mappers/artist.mapper";
import { mapContentToItem } from "@/lib/mappers/content.mapper";
import type { TrackRecordFull } from "@/lib/services/music.service";
import {
  getTrackEngagementStats,
  getTrackRecordBySlug,
} from "@/lib/services/music.service";
import {
  findSimilarTracks,
  listCollectionsContainingTrack,
  listCommunitiesForTrack,
} from "@/lib/services/catalog-relations.service";
import { prisma } from "@/lib/prisma";
import { listAllCatalogMusicTracks } from "@/lib/services/feed.service";
import {
  getUserReviewsForTarget,
  mergeDisplayedReviews,
} from "@/lib/services/review.service";

const g = (id: string, label: string) => ({ id, label });
const poster = (slug: string) => `/images/posters/${slug}.jpg`;
const hero = (n: 1 | 2 | 3 | 4) => `/images/hero-${n}.png`;

const reviewers: UserSummary[] = [
  { id: "r1", name: "Reetam Dutta", avatarColor: "#ff00cc" },
  { id: "r2", name: "Bishal Deb", avatarColor: "#ae00ff" },
  { id: "r3", name: "Aanya Rao", avatarColor: "#00ff8c" },
];

const gurengeReviews: Review[] = [
  {
    id: "gr-1",
    author: reviewers[0],
    rating: 9,
    headline: "The definitive Demon Slayer opening",
    content:
      "Gurenge hits every emotional beat of the series. LiSA's vocals soar over production that feels cinematic and urgent without drowning the melody.",
    likeCount: 3120,
    createdAt: "5 Jan, 2026",
    accent: "pink",
  },
  {
    id: "gr-2",
    author: reviewers[1],
    rating: 10,
    headline: "LiSA at her absolute peak",
    content:
      "From the first guitar riff to the final chorus, this track never lets up. Easily one of the best anime OPs of the last decade.",
    likeCount: 2840,
    createdAt: "12 Jan, 2026",
    accent: "cyan",
  },
  {
    id: "gr-3",
    author: reviewers[2],
    rating: 9,
    headline: "Still on repeat years later",
    content:
      "The energy is perfect for Demon Slayer's tone — dark, hopeful, and relentless. I come back to this song every time I rewatch the series.",
    likeCount: 1960,
    createdAt: "20 Jan, 2026",
    accent: "yellow",
  },
  {
    id: "gr-4",
    author: reviewers[0],
    rating: 9,
    headline: "Production and lyrics are flawless",
    content:
      "You can hear why this track charted globally. The mix gives LiSA space to breathe while the instrumentation builds into something massive.",
    likeCount: 1420,
    createdAt: "2 Feb, 2026",
    accent: "purple",
  },
  {
    id: "gr-5",
    author: reviewers[1],
    rating: 8,
    headline: "Instant mood boost",
    content:
      "Whether you are studying, training, or just vibing, Gurenge delivers. The Demon Slayer connection makes it even more special for fans.",
    likeCount: 980,
    createdAt: "14 Feb, 2026",
    accent: "green",
  },
  {
    id: "gr-6",
    author: reviewers[2],
    rating: 10,
    headline: "Best gateway into anime OSTs",
    content:
      "If someone asks where to start with anime music, I send them Gurenge first. Accessible, powerful, and impossible to skip.",
    likeCount: 860,
    createdAt: "28 Feb, 2026",
    accent: "blue",
  },
];

const gurengeDescription =
  "LiSA's breakout anthem for Demon Slayer: Kimetsu no Yaiba — a soaring J-rock track that mirrors Tanjiro's resolve. Blazing guitars, urgent drums, and a chorus built for stadium singalongs made Gurenge a global chart hit and one of the most recognizable anime openings of its generation. Gurenge stands out as a defining OST on EntertainVerse with sharp production, emotional lift, and replay value for both anime fans and music listeners.";

const gurengeDetail: ContentDetail = {
  id: "gurenge",
  title: "Gurenge",
  nativeTitle: "紅蓮華",
  type: "song",
  rating: 9.0,
  creditLabel: "By LiSA (From Demon Slayer Anime)",
  trendingLabel: "Trending Globally At #2 In Anime OST",
  genres: [g("jpop", "J-POP"), g("energetic", "Energetic")],
  description: gurengeDescription,
  synopsis: gurengeDescription,
  referenceUrl: buildSongReferenceUrl("Gurenge", "LiSA"),
  highlightTags: [],
  accent: "pink",
  metadata: {
    sourceMaterial: "Anime OST",
    releaseYear: 2019,
    languages: ["Japanese"],
    episodeDuration: "3:57",
    studio: "LiSA",
    director: "Leo-Nine",
    originalAuthor: "Demon Slayer",
    airedFrom: "Jul 2019",
    status: "Released",
  },
  imageUrl: poster("demon-slayer"),
  backdropUrl: poster("demon-slayer"),
  matchScore: 91,
  engagementStats: [
    { id: "likes", label: "Liked By", value: "100k" },
    { id: "listening", label: "Currently Listening", value: "50k" },
    { id: "views", label: "Played By", value: "1.8M" },
    { id: "collections", label: "Included in Collections", value: "15k" },
  ],
  seasons: [],
  episodes: [],
  sourceContentSlug: "demon-slayer",
  linkedArtist: {
    id: "lisa",
    title: "LiSA",
    type: "artist",
    genres: [g("jpop", "J-POP")],
    rating: 9.2,
    meta: "Solo Artist",
    year: 2010,
    imageUrl: hero(1),
    accent: "pink",
    matchScore: 92,
  },
  linkedSourceContent: {
    id: "demon-slayer",
    title: "Demon Slayer: Kimetsu no Yaiba",
    type: "anime",
    genres: [g("action", "Action"), g("fantasy", "Fantasy")],
    rating: 9.4,
    meta: "2 Seasons",
    year: 2019,
    imageUrl: poster("demon-slayer"),
    accent: "red",
    matchScore: 94,
  },
  characters: [
    {
      id: "lisa",
      name: "LiSA",
      role: "Artist",
      voiceActor: "LiSA",
      imageUrl: hero(1),
      accent: "pink",
    },
    {
      id: "demon-slayer",
      name: "Demon Slayer",
      role: "Anime",
      voiceActor: "TV Series",
      imageUrl: poster("demon-slayer"),
      accent: "cyan",
    },
    {
      id: "leo-nine",
      name: "Leo-Nine",
      role: "Album",
      voiceActor: "Sacra Music",
      imageUrl: "/images/album-swim.png",
      accent: "purple",
    },
  ],
  featuredOsts: [],
  relatedContent: [],
  collections: [],
  communities: [],
  reviews: gurengeReviews,
  resumeLabel: "1:24",
};

function makeCollectionsForSong(songId: string): Collection[] {
  const accents = ["green", "purple", "pink", "cyan"] as const;
  const slugs = ["demon-slayer", "jujutsu-kaisen", "attack-on-titan", "chainsaw-man"];
  const names = [
    "Anime Masterpieces",
    "LiSA Essentials",
    "Shonen Openings",
    "Epic OST Queue",
  ];
  return accents.map((accent, i) => ({
    id: `${songId}-col-${i + 1}`,
    name: names[i],
    description: "Curated tracks and OSTs picked for your listening taste.",
    itemCount: 28 + i * 4,
    favoriteCount: 12 + i * 3,
    visibility: "public" as const,
    createdAt: "8 Jan, 2026",
    updatedAt: `${i + 1} hrs ago`,
    accent,
    imageUrl: poster(slugs[i]),
  }));
}

function makeCommunitiesForSong(title: string): Community[] {
  const accents = ["yellow", "cyan", "purple", "pink"] as const;
  const names = [
    `Reetam Dutta's Anime Community`,
    "LiSA Fan Club",
    "Demon Slayer Music Hub",
    "Anime OST Collectors",
  ];
  return accents.map((accent, i) => ({
    id: `song-comm-${i + 1}`,
    name: names[i],
    category: "Music",
    memberCount: 38000 - i * 4500,
    postCount: 980 - i * 150,
    visibility: "public" as const,
    activityLevel: i === 0 ? "very-active" : "active",
    avgMatchScore: 94 - i,
    lastActiveAt: `${i + 1} hrs Ago`,
    accent,
    imageUrl: poster("demon-slayer"),
  }));
}

async function allMusicTracks(): Promise<MusicTrack[]> {
  return listAllCatalogMusicTracks(100);
}

function buildDetailFromTrack(
  track: MusicTrack,
  similar: MusicTrack[],
): ContentDetail {
  const description = `${track.title} by ${track.artist}${track.source ? ` — featured in ${track.source}` : ""}. A standout track matched to your listening history, genres, and mood preferences on EntertainVerse. ${track.title} delivers memorable hooks, polished production, and the kind of replay value fans expect from top-tier catalog picks.`;
  return {
    id: track.id,
    title: track.title,
    type: "song",
    rating: track.rating ?? 8.8,
    creditLabel: `By ${track.artist}${track.source ? ` (From ${track.source})` : ""}`,
    trendingLabel: `Trending on EntertainVerse · ${track.kind.toUpperCase()}`,
    genres: track.language
      ? [g(track.language.toLowerCase(), track.language)]
      : [g("music", "Music")],
    description,
    synopsis: description,
    referenceUrl: buildSongReferenceUrl(track.title, track.artist),
    highlightTags: [],
    accent: "purple",
    metadata: {
      sourceMaterial: track.kind === "ost" ? "Anime OST" : "Song",
      releaseYear: 2020,
      languages: track.language ? [track.language] : ["Japanese"],
      episodeDuration: "3:45",
      studio: track.artist,
      director: track.source ?? "Single",
      originalAuthor: track.source ?? track.artist,
      airedFrom: "2020",
      status: "Released",
    },
    imageUrl: track.imageUrl ?? poster("demon-slayer"),
    backdropUrl: track.imageUrl ?? poster("demon-slayer"),
    matchScore: track.matchScore ?? 88,
    engagementStats: [
      { id: "likes", label: "Liked By", value: "42k" },
      { id: "listening", label: "Currently Listening", value: "18k" },
      { id: "views", label: "Played By", value: "840k" },
      { id: "collections", label: "Included in Collections", value: "6.2k" },
    ],
    seasons: [],
    episodes: [],
    characters: [
      {
        id: `${track.id}-artist`,
        name: track.artist,
        role: "Artist",
        imageUrl: track.imageUrl ?? poster("demon-slayer"),
        accent: "pink",
      },
      ...(track.source
        ? [
            {
              id: `${track.id}-source`,
              name: track.source,
              role: "Show",
              imageUrl: track.imageUrl ?? poster("demon-slayer"),
              accent: "cyan" as const,
            },
          ]
        : []),
    ],
    featuredOsts: similar.filter((t) => t.id !== track.id).slice(0, 6),
    relatedContent: [],
    collections: makeCollectionsForSong(track.id),
    communities: makeCommunitiesForSong(track.title),
    reviews: gurengeReviews.map((r, i) => ({
      ...r,
      id: `${track.id}-review-${i}`,
    })),
  };
}

const contentGenreInclude = {
  genres: { include: { genre: true } },
} as const;

async function enrichSongCatalogLinks(
  detail: ContentDetail,
  row: TrackRecordFull,
): Promise<ContentDetail> {
  let linkedArtist = detail.linkedArtist;
  let linkedSourceContent = detail.linkedSourceContent;
  let sourceContentSlug = detail.sourceContentSlug;

  if (!linkedArtist) {
    if (row.artistRef) {
      linkedArtist = mapArtistToContentItem(row.artistRef);
    } else if (row.artist.trim()) {
      const artist = await prisma.artist.findFirst({
        where: { title: { equals: row.artist.trim(), mode: "insensitive" } },
      });
      if (artist) linkedArtist = mapArtistToContentItem(artist);
    }
  }

  if (!linkedSourceContent) {
    if (row.sourceContent) {
      linkedSourceContent = mapContentToItem(row.sourceContent);
      sourceContentSlug = row.sourceContent.slug;
    } else if (row.kind === "ost" && row.source?.trim()) {
      const source = row.source.trim();
      const content = await prisma.content.findFirst({
        where: {
          OR: [
            { title: { equals: source, mode: "insensitive" } },
            { title: { contains: source, mode: "insensitive" } },
          ],
        },
        include: contentGenreInclude,
      });
      if (content) {
        linkedSourceContent = mapContentToItem(content);
        sourceContentSlug = content.slug;
      }
    }
  }

  return {
    ...detail,
    linkedArtist,
    linkedSourceContent,
    sourceContentSlug,
  };
}

export async function getSongDetail(
  songId: string,
  viewerUserId?: string,
): Promise<ContentDetail | null> {
  const slug = normalizeSongSlug(songId);
  const record = await getTrackRecordBySlug(slug);

  if (record) {
    const genreLabels = Array.isArray(record.genres)
      ? record.genres.filter((item): item is string => typeof item === "string")
      : [];

    const [engagement, similar, collections, communities, userReviews] =
      await Promise.all([
        getTrackEngagementStats(record.id),
        findSimilarTracks({
          slug: record.slug,
          artistId: record.artistId,
          artist: record.artist,
          contentId: record.contentId,
          genres: record.genres,
          language: record.language,
        }),
        listCollectionsContainingTrack(record.id),
        listCommunitiesForTrack(record.id, {
          title: record.title,
          artist: record.artist,
          contentId: record.contentId,
          genreLabels,
        }),
        getUserReviewsForTarget("song", slug, viewerUserId),
      ]);

    const detail = mapTrackRecordToSongDetail(record, engagement, similar);
    detail.collections = collections;
    detail.communities = communities;
    detail.reviews = mergeDisplayedReviews(userReviews, detail.reviews);
    return enrichSongCatalogLinks(detail, record);
  }

  if (slug === "gurenge") {
    const similar = await allMusicTracks();
    return {
      ...gurengeDetail,
      featuredOsts: similar
        .filter((t) => t.id !== "gurenge")
        .slice(0, 6),
      collections: makeCollectionsForSong("gurenge"),
      communities: makeCommunitiesForSong("Gurenge"),
    };
  }

  const tracks = await allMusicTracks();
  const track = tracks.find(
    (t) =>
      t.id === songId ||
      t.id === slug ||
      normalizeSongSlug(t.id) === slug,
  );
  if (!track) return null;

  return buildDetailFromTrack(track, tracks);
}

