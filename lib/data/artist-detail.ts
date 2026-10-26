import { buildArtistReferenceUrl } from "@/lib/content-reference-url";
import type {
  ArtistDetail,
  Character,
  Collection,
  Community,
  ContentItem,
  MusicTrack,
  Review,
  UserSummary,
} from "@/types";
import { normalizeArtistSlug } from "@/lib/artist-routes";
import { mapArtistRecordToDetail } from "@/lib/mappers/artist-detail.mapper";
import {
  getArtistRecordBySlug,
} from "@/lib/services/artist.service";
import { isArtistFollowed, getArtistFollowerPreview } from "@/lib/services/artist-follow.service";
import { isArtistFavorited } from "@/lib/services/favorite.service";
import {
  artistGenreSlugsFromRecord,
  findSimilarArtists,
  listCollectionsContainingArtistTracks,
  listCommunitiesForArtist,
} from "@/lib/services/catalog-relations.service";
import {
  getUserReviewsForTarget,
  mergeDisplayedReviews,
} from "@/lib/services/review.service";

const g = (id: string, label: string) => ({ id, label });
const poster = (slug: string) => `/images/posters/${slug}.jpg`;
const hero = (n: 1 | 2 | 3 | 4) => `/images/hero-${n}.png`;
const twiceBanner = "/images/artists/twice.jpg";

const reviewers: UserSummary[] = [
  { id: "r1", name: "Reetam Dutta", avatarColor: "#ff00cc" },
  { id: "r2", name: "Bishal Deb", avatarColor: "#ae00ff" },
  { id: "r3", name: "Aanya Rao", avatarColor: "#00ff8c" },
];

const twiceReviews: Review[] = [
  {
    id: "tr-1",
    author: reviewers[0],
    rating: 10,
    headline: "The definitive K-pop girl group",
    content:
      "TWICE's discography is unmatched for feel-good pop with real emotional depth. From FANCY to SET ME FREE, every era hits differently.",
    likeCount: 4820,
    createdAt: "3 Jan, 2026",
    accent: "pink",
  },
  {
    id: "tr-2",
    author: reviewers[1],
    rating: 9,
    headline: "Perfect gateway into K-pop",
    content:
      "Bright concepts, flawless choreography, and hooks that never leave your head. TWICE made me explore the entire genre.",
    likeCount: 3640,
    createdAt: "11 Jan, 2026",
    accent: "cyan",
  },
  {
    id: "tr-3",
    author: reviewers[2],
    rating: 10,
    headline: "Nine voices, one unstoppable sound",
    content:
      "Each member brings something unique — Nayeon's power, Mina's elegance, Tzuyu's charm. Their chemistry is what makes every comeback special.",
    likeCount: 2910,
    createdAt: "19 Jan, 2026",
    accent: "yellow",
  },
  {
    id: "tr-4",
    author: reviewers[0],
    rating: 9,
    headline: "Discography depth surprised me",
    content:
      "Beyond the hits, their B-sides and Japanese releases are incredible. Scientist and Alcohol-Free are sleeper masterpieces.",
    likeCount: 1780,
    createdAt: "28 Jan, 2026",
    accent: "purple",
  },
  {
    id: "tr-5",
    author: reviewers[1],
    rating: 9,
    headline: "Live performances are electric",
    content:
      "Studio recordings are great but TWICE on stage is another level. The energy, the fan chants, the production — pure joy.",
    likeCount: 1420,
    createdAt: "6 Feb, 2026",
    accent: "green",
  },
  {
    id: "tr-6",
    author: reviewers[2],
    rating: 10,
    headline: "Still charting after a decade",
    content:
      "Very few groups sustain this level of relevance. TWICE keeps evolving without losing what made fans fall in love in the first place.",
    likeCount: 980,
    createdAt: "15 Feb, 2026",
    accent: "blue",
  },
];

const twiceSongTitles = [
  "One Spark",
  "The Feels",
  "Yes or Yes",
  "FANCY",
  "Feel Special",
  "I Can't Stop Me",
  "Scientist",
  "Talk That Talk",
  "Moonlight",
  "Alcohol-Free",
  "What is Love",
  "Cry For Me",
  "Set Me Free",
  "Strategy",
  "Dance The Night Away",
  "Heart Shaker",
  "Likey",
  "Cheer Up",
  "TT",
  "Knock Knock",
  "Signal",
  "More & More",
  "I Got You",
  "Celebrate",
] as const;

const posterSlugs = [
  "jujutsu-kaisen",
  "demon-slayer",
  "attack-on-titan",
  "chainsaw-man",
  "spy-x-family",
  "frieren",
  "vinland-saga",
  "your-name",
  "one-piece",
  "bleach",
  "naruto",
  "my-hero-academia",
] as const;

function makeTwiceTracks(
  titles: readonly string[],
  kind: MusicTrack["kind"] = "song",
): MusicTrack[] {
  return titles.map((title, i) => ({
    id: `twice-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    artist: "TWICE",
    kind,
    language: i % 3 === 0 ? "English" : i % 3 === 1 ? "Kpop" : "Japanese",
    rating: 8.8 + (i % 5) * 0.2,
    matchScore: 90 + (i % 6),
    imageUrl: poster(posterSlugs[i % posterSlugs.length]),
  }));
}

const twiceSongs = makeTwiceTracks(twiceSongTitles);

const twiceAlbums: MusicTrack[] = [
  { id: "twice-album-fancy-you", title: "FANCY YOU", artist: "TWICE", kind: "album", language: "Kpop", rating: 9.2, matchScore: 94, imageUrl: poster("jujutsu-kaisen") },
  { id: "twice-album-feel-special", title: "Feel Special", artist: "TWICE", kind: "album", language: "Kpop", rating: 9.0, matchScore: 93, imageUrl: poster("demon-slayer") },
  { id: "twice-album-eyes-wide-open", title: "Eyes Wide Open", artist: "TWICE", kind: "album", language: "Kpop", rating: 9.1, matchScore: 95, imageUrl: poster("attack-on-titan") },
  { id: "twice-album-between", title: "&TWICE", artist: "TWICE", kind: "album", language: "Japanese", rating: 8.9, matchScore: 91, imageUrl: "/images/album-swim.png" },
  { id: "twice-album-formula", title: "Formula of Love", artist: "TWICE", kind: "album", language: "Kpop", rating: 9.3, matchScore: 96, imageUrl: poster("chainsaw-man") },
  { id: "twice-album-ready-to-be", title: "Ready To Be", artist: "TWICE", kind: "album", language: "Kpop", rating: 9.0, matchScore: 92, imageUrl: poster("spy-x-family") },
];

const twiceMembers: Character[] = [
  { id: "nayeon", name: "Nayeon", role: "Member", voiceActor: "Lead Vocal", imageUrl: hero(1), accent: "pink" },
  { id: "jeongyeon", name: "Jeongyeon", role: "Member", voiceActor: "Vocal", imageUrl: hero(2), accent: "cyan" },
  { id: "momo", name: "Momo", role: "Member", voiceActor: "Main Dancer", imageUrl: hero(3), accent: "purple" },
  { id: "sana", name: "Sana", role: "Member", voiceActor: "Vocal", imageUrl: hero(4), accent: "yellow" },
  { id: "jihyo", name: "Jihyo", role: "Member", voiceActor: "Leader · Vocal", imageUrl: hero(1), accent: "green" },
  { id: "mina", name: "Mina", role: "Member", voiceActor: "Dancer", imageUrl: hero(2), accent: "blue" },
  { id: "dahyun", name: "Dahyun", role: "Member", voiceActor: "Rapper", imageUrl: hero(3), accent: "pink" },
  { id: "chaeyoung", name: "Chaeyoung", role: "Member", voiceActor: "Rapper", imageUrl: hero(4), accent: "cyan" },
  { id: "tzuyu", name: "Tzuyu", role: "Member", voiceActor: "Visual · Vocal", imageUrl: hero(1), accent: "purple" },
];

const similarArtists: ContentItem[] = [
  { id: "katseye", title: "KATSEYE", type: "artist", genres: [g("kpop", "K-Pop")], rating: 8.8, matchScore: 89, imageUrl: hero(2), meta: "Girl Group" },
  { id: "red-velvet", title: "RED VELVET", type: "artist", genres: [g("kpop", "K-Pop")], rating: 9.2, matchScore: 93, imageUrl: hero(3), meta: "Girl Group" },
  { id: "newjeans", title: "NewJeans", type: "artist", genres: [g("kpop", "K-Pop")], rating: 9.4, matchScore: 95, imageUrl: hero(4), meta: "Girl Group" },
  { id: "le-sserafim", title: "LE SSERAFIM", type: "artist", genres: [g("kpop", "K-Pop")], rating: 9.1, matchScore: 92, imageUrl: poster("jujutsu-kaisen"), meta: "Girl Group" },
  { id: "aespa", title: "aespa", type: "artist", genres: [g("kpop", "K-Pop")], rating: 9.3, matchScore: 94, imageUrl: poster("demon-slayer"), meta: "Girl Group" },
  { id: "ive", title: "IVE", type: "artist", genres: [g("kpop", "K-Pop")], rating: 9.0, matchScore: 91, imageUrl: poster("attack-on-titan"), meta: "Girl Group" },
];

function makeCollections(): Collection[] {
  const accents = ["green", "purple", "pink", "cyan"] as const;
  const names = ["TWICE Essentials", "K-Pop Girl Groups", "Feel-Good Pop", "J-Pop Crossovers"];
  return accents.map((accent, i) => ({
    id: `twice-col-${i + 1}`,
    name: names[i],
    description: "Curated tracks and albums picked for your listening taste.",
    itemCount: 32 + i * 6,
    favoriteCount: 18 + i * 4,
    visibility: "public" as const,
    createdAt: "12 Jan, 2026",
    updatedAt: `${i + 1} hrs ago`,
    accent,
    imageUrl: poster(posterSlugs[i]),
  }));
}

function makeCommunities(): Community[] {
  return [
    {
      id: "twice",
      name: "TWICE Fanverse",
      category: "Kpop",
      memberCount: 42000,
      postCount: 1248,
      visibility: "public",
      activityLevel: "very-active",
      avgMatchScore: 96,
      createdAt: "23rd Aug, 2025",
      accent: "yellow",
    },
    {
      id: "kpop-girl-groups",
      name: "K-Pop Girl Groups Hub",
      category: "Kpop",
      memberCount: 28500,
      postCount: 890,
      visibility: "public",
      activityLevel: "active",
      avgMatchScore: 92,
      lastActiveAt: "1 hr ago",
      accent: "pink",
    },
    {
      id: "jyp-nation",
      name: "JYP Nation Fans",
      category: "Kpop",
      memberCount: 35200,
      postCount: 1102,
      visibility: "public",
      activityLevel: "very-active",
      avgMatchScore: 94,
      lastActiveAt: "3 hrs ago",
      accent: "cyan",
    },
    {
      id: "kpop-playlists",
      name: "K-Pop Playlist Builders",
      category: "Music",
      memberCount: 19800,
      postCount: 640,
      visibility: "public",
      activityLevel: "active",
      avgMatchScore: 88,
      lastActiveAt: "5 hrs ago",
      accent: "purple",
    },
  ];
}

const twiceBio =
  "TWICE is a South Korean girl group celebrated for bright pop anthems, polished choreography, and chart-dominating comebacks. From bubblegum hits to sleek dance-pop, their sound spans Korean, Japanese, and English releases — making them one of the most streamed K-pop acts worldwide. TWICE records under JYP Entertainment and debuted in 2015, growing into one of the most streamed names in K-POP. Known for choreography-forward singles, fan-driven comebacks, and global tours, TWICE remains a cornerstone artist for playlist builders and OST hunters on the platform.";

const twiceDetail: ArtistDetail = {
  id: "twice",
  title: "TWICE",
  nativeTitle: "트와이스",
  rating: 9.6,
  rankLeft: "#10 in Kpop music",
  rankRight: "#1 in your favourite artist",
  genres: [
    g("dance-pop", "Dance Pop"),
    g("kpop", "K-Pop"),
  ],
  description: twiceBio,
  synopsis: twiceBio,
  referenceUrl: buildArtistReferenceUrl("TWICE"),
  primaryTags: [
    "Dance Pop",
    "K-pop",
    "Since 2015",
    "Korean, English, Japanese",
  ],
  accent: "pink",
  matchScore: 100,
  songCount: 200,
  albumCount: 25,
  metadata: {
    studio: "JYP Entertainment",
    sourceMaterial: "K-Pop Group",
    releaseYear: 2015,
    languages: ["Korean", "Japanese", "English"],
    country: "South Korea",
    status: "Active",
    airedFrom: "Oct 2015",
    producers: "JYP Entertainment",
  },
  imageUrl: twiceBanner,
  engagementStats: [
    { id: "followers", label: "Total Followers", value: "12.8M" },
    { id: "listeners", label: "Monthly Listeners", value: "8.4M" },
    { id: "playlist", label: "Songs in Your Playlist", value: "32" },
    { id: "likes", label: "Liked Songs", value: "20" },
    { id: "plays", label: "Total Plays From You", value: "3.2K" },
  ],
  members: twiceMembers,
  connections: [
    { id: "rahul", name: "Rahul_89", avatarColor: "#ff00cc" },
    { id: "lk45", name: "Lk45_89", avatarColor: "#00ff8c" },
    { id: "reetam", name: "reetam_2308", avatarColor: "#ae00ff" },
  ],
  connectionSummary:
    "Rahul_89, Lk45_89, reetam_2308 and 3 more connections follow TWICE.",
  followerCount: 6,
  nowPlaying: {
    title: "FANCY",
    album: "FANCY YOU",
    songId: "twice-fancy",
    progressPercent: 0,
    elapsedLabel: "0:00",
    durationLabel: "3:57",
    imageUrl: twiceBanner,
  },
  trendingSongs: [
    twiceSongs.find((t) => t.title === "One Spark")!,
    twiceSongs.find((t) => t.title === "The Feels")!,
    twiceSongs.find((t) => t.title === "Yes or Yes")!,
    twiceSongs.find((t) => t.title === "FANCY")!,
    twiceSongs.find((t) => t.title === "Feel Special")!,
    twiceSongs.find((t) => t.title === "Scientist")!,
  ].filter(Boolean),
  allSongs: twiceSongs,
  mostPlayed: [...twiceSongs]
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 18),
  mostLiked: twiceSongs.slice(3, 21),
  albums: twiceAlbums,
  similarArtists,
  collections: makeCollections(),
  communities: makeCommunities(),
  reviews: twiceReviews,
};

const curatedById: Record<string, ArtistDetail> = {
  twice: twiceDetail,
};

export async function getArtistDetail(
  artistid: string,
  viewerUserId?: string,
): Promise<ArtistDetail | null> {
  const slug = normalizeArtistSlug(artistid);
  const record = await getArtistRecordBySlug(slug);
  if (record) {
    const detail = mapArtistRecordToDetail(record);
    const genreSlugs = artistGenreSlugsFromRecord(record);
    const [collections, communities, similarArtists, userReviews] = await Promise.all([
      listCollectionsContainingArtistTracks(record.id),
      listCommunitiesForArtist(record.id, {
        title: record.title,
        genreLabels: genreSlugs,
      }),
      findSimilarArtists(record.id, genreSlugs, slug),
      getUserReviewsForTarget("artist", slug, viewerUserId),
    ]);

    detail.collections = collections;
    detail.communities = communities;
    detail.similarArtists = similarArtists;
    detail.reviews = mergeDisplayedReviews(userReviews, detail.reviews);

    if (viewerUserId) {
      const [viewerFavorited, viewerFollowing] = await Promise.all([
        isArtistFavorited(viewerUserId, slug),
        isArtistFollowed(viewerUserId, slug),
      ]);
      detail.viewerFavorited = viewerFavorited;
      detail.viewerFollowing = viewerFollowing;
    }

    const followerPreview = await getArtistFollowerPreview(slug);
    detail.followerCount = followerPreview.followerCount;
    detail.connections = followerPreview.followers;
    detail.connectionSummary = followerPreview.summary;

    return detail;
  }
  return curatedById[slug] ?? null;
}
