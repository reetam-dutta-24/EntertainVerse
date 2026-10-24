import type { Character, Collection, Community, ContentDetail, ContentItem, Episode, MusicTrack, Review, UserSummary } from "@/types";
import { normalizeContentSlug } from "@/lib/content-routes";
import {
  getContentEngagementStats,
  getContentItemBySlug,
  getContentRecordBySlug,
  listAllContentSlugs,
} from "@/lib/services/content.service";
import { mapContentRecordToDetail } from "@/lib/mappers/content-detail.mapper";
import {
  findSimilarContent,
  listCollectionsContainingContent,
  listCommunitiesForContent,
} from "@/lib/services/catalog-relations.service";
import { getRecommendedContent } from "@/lib/services/feed.service";
import {
  getUserReviewsForTarget,
  mergeDisplayedReviews,
} from "@/lib/services/review.service";

/**
 * Mock data layer — individual content detail (`/content/[contentid]`).
 * Field names mirror the planned DB schema for drop-in API replacement.
 */

const g = (id: string, label: string) => ({ id, label });
const poster = (slug: string) => `/images/posters/${slug}.jpg`;
const hero = (n: 1 | 2 | 3 | 4) => `/images/hero-${n}.png`;

/** Distinct stills per episode (DB: `episode.thumbnail_url`). */
const jjkEpisodeThumbs = [
  "/images/poster-jjk.png",
  hero(1),
  hero(2),
  hero(3),
  hero(4),
  poster("chainsaw-man"),
  poster("demon-slayer"),
  poster("tokyo-ghoul"),
  poster("attack-on-titan"),
  poster("death-note"),
  poster("vinland-saga"),
  poster("spy-x-family"),
] as const;

const epThumb = (index: number) =>
  jjkEpisodeThumbs[index % jjkEpisodeThumbs.length];
import { buildContentReferenceUrl } from "@/lib/content-reference-url";
import { DETAIL_SYNOPSIS_WORDS, formatDetailSynopsis } from "@/lib/format-detail-synopsis";

export { DETAIL_SYNOPSIS_WORDS, formatDetailSynopsis };

const reviewers: UserSummary[] = [
  { id: "r1", name: "Reetam Dutta", avatarColor: "#ff00cc" },
  { id: "r2", name: "Bishal Deb", avatarColor: "#ae00ff" },
  { id: "r3", name: "Aanya Rao", avatarColor: "#00ff8c" },
];

const episodeMeta = {
  language: "Japanese",
  views: "2.4M",
  likes: "15k",
  rating: 9.1,
};

const jjkEpisodes: Episode[] = [
  {
    id: "jjk-s1e1",
    seasonNumber: 1,
    number: 1,
    title: "Ryomen Sukuna",
    duration: "24m",
    description:
      "After visiting his grandfather in the hospital, Itadori Yuji encounters a sorcerer who tells him about curses and the world of jujutsu. His ordinary life ends when he swallows a cursed finger to protect his friends.",
    thumbnailUrl: epThumb(0),
    ...episodeMeta,
    rating: 9.1,
  },
  {
    id: "jjk-s1e2",
    seasonNumber: 1,
    number: 2,
    title: "For Myself",
    duration: "24m",
    description:
      "Yuji learns he has become the vessel of Sukuna. To gain control over the curse, he enrolls at Tokyo Jujutsu High and meets his eccentric teacher and new allies.",
    thumbnailUrl: epThumb(1),
    language: "Japanese",
    views: "2.1M",
    likes: "12k",
    rating: 8.9,
  },
  {
    id: "jjk-s1e3",
    seasonNumber: 1,
    number: 3,
    title: "Girl of Steel",
    duration: "24m",
    description:
      "Nobara Kugisaki transfers to Jujutsu High. The first-years are sent on a trial mission that quickly escalates into a fight for survival against a powerful curse.",
    thumbnailUrl: epThumb(2),
    language: "Japanese",
    views: "1.9M",
    likes: "11k",
    rating: 8.8,
  },
  {
    id: "jjk-s1e4",
    seasonNumber: 1,
    number: 4,
    title: "Curse Womb Must Die",
    duration: "24m",
    description:
      "The team enters a curse womb at an abandoned juvenile detention center. What was meant to be a simple exorcism becomes a battle against a special-grade curse.",
    thumbnailUrl: epThumb(3),
    language: "Japanese",
    views: "1.8M",
    likes: "10k",
    rating: 9.0,
  },
  {
    id: "jjk-s1e5",
    seasonNumber: 1,
    number: 5,
    title: "Curse Womb Must Die -II-",
    duration: "24m",
    description:
      "Megumi is pushed to his limit as Sukuna awakens inside Yuji. The students must survive with everything on the line and prove they belong at Jujutsu High.",
    thumbnailUrl: epThumb(4),
    language: "Japanese",
    views: "1.7M",
    likes: "9.8k",
    rating: 9.2,
  },
  {
    id: "jjk-s1e6",
    seasonNumber: 1,
    number: 6,
    title: "After Rain",
    duration: "24m",
    description:
      "After the mission, the first-years recover and reflect. Gojo introduces them to the wider politics of the jujutsu world and what their futures may hold.",
    thumbnailUrl: epThumb(5),
    language: "Japanese",
    views: "1.5M",
    likes: "8.4k",
    rating: 8.7,
  },
  {
    id: "jjk-s1e7",
    seasonNumber: 1,
    number: 7,
    title: "Assault",
    duration: "24m",
    description:
      "A cursed spirit targets Jujutsu High. The students and faculty mobilize as tensions rise between factions that want Yuji dead and those who see him as hope.",
    thumbnailUrl: epThumb(6),
    language: "Japanese",
    views: "1.4M",
    likes: "8.1k",
    rating: 8.9,
    isLastPlayed: true,
  },
  {
    id: "jjk-s1e8",
    seasonNumber: 1,
    number: 8,
    title: "Boredom",
    duration: "24m",
    description:
      "Sukuna's presence looms as the students train harder. A seemingly relaxed day at school hides the growing threat of curses gathering around Tokyo.",
    thumbnailUrl: epThumb(7),
    language: "Japanese",
    views: "1.3M",
    likes: "7.6k",
    rating: 8.6,
  },
  {
    id: "jjk-s1e9",
    seasonNumber: 1,
    number: 9,
    title: "Small Fry and Reverse Retribution",
    duration: "24m",
    description:
      "Past traumas resurface for Megumi and Nobara as a new mission forces them to confront the cost of being sorcerers and the weight of their choices.",
    thumbnailUrl: epThumb(8),
    language: "Japanese",
    views: "1.2M",
    likes: "7.2k",
    rating: 9.0,
  },
  {
    id: "jjk-s1e10",
    seasonNumber: 1,
    number: 10,
    title: "Idle Transfiguration",
    duration: "24m",
    description:
      "Mahito's ideology clashes with Yuji's humanity in a brutal confrontation. The first-years learn how cruel the jujutsu world can be when curses treat people as material.",
    thumbnailUrl: epThumb(9),
    language: "Japanese",
    views: "1.1M",
    likes: "6.9k",
    rating: 9.1,
  },
  {
    id: "jjk-s1e11",
    seasonNumber: 1,
    number: 11,
    title: "Narrow-minded",
    duration: "24m",
    description:
      "Nanami and Yuji team up against mutated curses. Their contrasting philosophies reveal what it means to protect others while carrying the weight of every life lost.",
    thumbnailUrl: epThumb(10),
    language: "Japanese",
    views: "1.0M",
    likes: "6.5k",
    rating: 8.9,
  },
  {
    id: "jjk-s1e12",
    seasonNumber: 1,
    number: 12,
    title: "To You, Someday",
    duration: "24m",
    description:
      "The Kyoto Goodwill Event approaches as rival schools size each other up. Alliances are tested and every fighter prepares for a tournament that will not stay friendly for long.",
    thumbnailUrl: epThumb(11),
    language: "Japanese",
    views: "980k",
    likes: "6.2k",
    rating: 8.8,
  },
  {
    id: "jjk-s2e1",
    seasonNumber: 2,
    number: 1,
    title: "Hidden Inventory",
    duration: "24m",
    description:
      "Gojo recounts his past as a student alongside Geto and Shoko. Their mission to protect a young Star Plasma Vessel reveals how the jujutsu world's ideals can break people.",
    thumbnailUrl: epThumb(9),
    language: "Japanese",
    views: "2.0M",
    likes: "14k",
    rating: 9.4,
  },
  {
    id: "jjk-s2e2",
    seasonNumber: 2,
    number: 2,
    title: "Hidden Inventory 2",
    duration: "24m",
    description:
      "The mission escalates as assassins close in on Riko. Young Gojo and Geto must push their limits while the consequences of failure grow impossible to ignore.",
    thumbnailUrl: epThumb(10),
    language: "Japanese",
    views: "1.9M",
    likes: "13k",
    rating: 9.3,
  },
  {
    id: "jjk-s2e3",
    seasonNumber: 2,
    number: 3,
    title: "Hidden Inventory 3",
    duration: "24m",
    description:
      "Tragedy reshapes Gojo and Geto's friendship forever. The arc's fallout sets the stage for the ideological war that will define modern jujutsu society.",
    thumbnailUrl: epThumb(11),
    language: "Japanese",
    views: "1.8M",
    likes: "12k",
    rating: 9.5,
  },
  {
    id: "jjk-s2e4",
    seasonNumber: 2,
    number: 4,
    title: "Shibuya Incident",
    duration: "24m",
    description:
      "Chaos erupts across Shibuya as multiple curse user factions spring their trap. The sorcerers are scattered, outnumbered, and fighting on the enemy's terms.",
    thumbnailUrl: hero(1),
    language: "Japanese",
    views: "2.3M",
    likes: "16k",
    rating: 9.6,
  },
  {
    id: "jjk-s2e5",
    seasonNumber: 2,
    number: 5,
    title: "Shibuya Incident 2",
    duration: "24m",
    description:
      "Yuji and Nanami race through transformed streets while civilians remain trapped in the crossfire. Every decision carries immediate life-or-death weight.",
    thumbnailUrl: hero(2),
    language: "Japanese",
    views: "2.1M",
    likes: "15k",
    rating: 9.4,
  },
  {
    id: "jjk-s2e6",
    seasonNumber: 2,
    number: 6,
    title: "Shibuya Incident 3",
    duration: "24m",
    description:
      "The battle reaches a devastating turning point. Alliances fracture, sacrifices mount, and the cost of protecting non-sorcerers becomes unbearably clear.",
    thumbnailUrl: hero(3),
    language: "Japanese",
    views: "2.0M",
    likes: "14k",
    rating: 9.7,
  },
];

const jjkCharacters: Character[] = [
  {
    id: "yuji",
    name: "Yuji Itadori",
    role: "Main Character",
    voiceActor: "Junya Enoki",
    imageUrl: "/images/poster-jjk.png",
    accent: "pink",
  },
  {
    id: "gojo",
    name: "Satoru Gojo",
    role: "Main Character",
    voiceActor: "Yuichi Nakamura",
    imageUrl: hero(1),
    accent: "cyan",
  },
  {
    id: "megumi",
    name: "Megumi Fushiguro",
    role: "Main Character",
    voiceActor: "Yuma Uchida",
    imageUrl: hero(2),
    accent: "purple",
  },
  {
    id: "nobara",
    name: "Nobara Kugisaki",
    role: "Main Character",
    voiceActor: "Asami Seto",
    imageUrl: hero(3),
    accent: "yellow",
  },
  {
    id: "sukuna",
    name: "Ryomen Sukuna",
    role: "Antagonist",
    voiceActor: "Junichi Suwabe",
    imageUrl: hero(4),
    accent: "blue",
  },
  {
    id: "nanami",
    name: "Kento Nanami",
    role: "Supporting",
    voiceActor: "Kenjiro Tsuda",
    imageUrl: poster("monster"),
    accent: "green",
  },
];

const jjkOsts: MusicTrack[] = [
  {
    id: "ost-blue",
    title: "Where Our Blue Is",
    artist: "Tatsuya Kitani",
    kind: "ost",
    source: "Jujutsu Kaisen",
    language: "Japanese",
    rating: 9.6,
    matchScore: 98,
    imageUrl: "/images/album-swim.png",
  },
  {
    id: "ost-kaikai",
    title: "Kaikai Kitan",
    artist: "Eve",
    kind: "ost",
    source: "Jujutsu Kaisen",
    language: "Japanese",
    rating: 9.4,
    matchScore: 97,
    imageUrl: poster("night-dancer"),
  },
  {
    id: "ost-specialz",
    title: "SPECIALZ",
    artist: "King Gnu",
    kind: "ost",
    source: "Jujutsu Kaisen",
    language: "Japanese",
    rating: 9.3,
    matchScore: 95,
    imageUrl: poster("chainsaw-man"),
  },
  {
    id: "ost-lost",
    title: "LOST IN PARADISE",
    artist: "ALI feat. AKLO",
    kind: "ost",
    source: "Jujutsu Kaisen",
    language: "Japanese",
    rating: 9.1,
    matchScore: 94,
    imageUrl: poster("demon-slayer"),
  },
  {
    id: "ost-vivid",
    title: "VIVID VICE",
    artist: "ZUTOMAYO",
    kind: "ost",
    source: "Jujutsu Kaisen",
    language: "Japanese",
    rating: 8.9,
    matchScore: 91,
    imageUrl: poster("tokyo-ghoul"),
  },
];

const jjkReviews: Review[] = [
  {
    id: "rev-1",
    author: reviewers[0],
    rating: 9,
    headline: "One of the best modern shonen anime",
    content:
      "Jujutsu Kaisen delivers incredible animation, a dark tone, and characters you actually care about. MAPPA went all out on the fight choreography and every episode feels cinematic.",
    likeCount: 2840,
    createdAt: "12 Jan, 2026",
    accent: "yellow",
  },
  {
    id: "rev-2",
    author: reviewers[1],
    rating: 10,
    headline: "Gojo alone is worth the watch",
    content:
      "The power system is fresh, the pacing is tight, and the OST hits every emotional beat. Easily in my top five anime of the decade.",
    likeCount: 1920,
    createdAt: "18 Jan, 2026",
    accent: "cyan",
  },
  {
    id: "rev-3",
    author: reviewers[2],
    rating: 9,
    headline: "Dark, stylish, and addictive",
    content:
      "Perfect blend of horror and action. I binged all seasons in a week and immediately rewatched the Shibuya arc. The community here is amazing too.",
    likeCount: 1560,
    createdAt: "2 Feb, 2026",
    accent: "pink",
  },
  {
    id: "rev-4",
    author: reviewers[0],
    rating: 8,
    headline: "Shibuya arc is peak anime television",
    content:
      "Season 2 raised the bar for animation and storytelling. Every fight has weight, and the emotional beats land harder because the cast feels so human.",
    likeCount: 980,
    createdAt: "14 Feb, 2026",
    accent: "purple",
  },
  {
    id: "rev-5",
    author: reviewers[1],
    rating: 9,
    headline: "Soundtrack elevates every scene",
    content:
      "From Kaikai Kitan to SPECIALZ, the OST lineup is stacked. I keep coming back for the music alone — the featured tracks section is spot on.",
    likeCount: 740,
    createdAt: "28 Feb, 2026",
    accent: "green",
  },
  {
    id: "rev-6",
    author: reviewers[2],
    rating: 10,
    headline: "Best introduction to modern cursed-energy anime",
    content:
      "If you are new to the genre, start here. Clear rules, great mentors, terrifying villains, and a community that actually discusses lore without spoilers.",
    likeCount: 620,
    createdAt: "8 Mar, 2026",
    accent: "blue",
  },
];

const jjkSynopsis =
  "A boy swallows a cursed talisman and becomes the vessel of a demon. He enrolls at a shaman school to find the remaining fingers and survive a war between sorcerers and curses. Alongside Megumi, Nobara, and Satoru Gojo, Yuji Itadori faces brutal missions where failure means death. Dark stylish action with MAPPA animation, cursed energy battles, and stakes that escalate from school trials to the devastation of Shibuya. Jujutsu Kaisen stands out as a thriller anime with sharp pacing, layered characters, and set pieces that fans revisit on AniVerse. Released in 2019 by MAPPA, directed by Sunghoo Park, it continues to draw new viewers alongside devoted fans who appreciate its craft and emotional payoff.";

const jjkDetail: ContentDetail = {
  id: "jujutsu-kaisen",
  title: "Jujutsu Kaisen",
  nativeTitle: "呪術廻戦",
  type: "anime",
  rating: 9.2,
  trendingLabel: "Trending Globally At 49th in Shows/Anime",
  genres: [
    g("thriller", "Thriller"),
    g("action", "Action"),
  ],
  description: jjkSynopsis,
  synopsis: jjkSynopsis,
  referenceUrl: buildContentReferenceUrl("anime", "Jujutsu Kaisen", 2020),
  highlightTags: [],
  accent: "blue",
  metadata: {
    imdbRating: 9.2,
    malScore: 8.6,
    ageRating: "16+",
    status: "Ongoing",
    studio: "MAPPA",
    director: "Sunghoo Park",
    composer: "Yoshimasa Terui",
    originalAuthor: "Gege Akutami",
    sourceMaterial: "Manga",
    producers: "MAPPA, Shueisha",
    network: "MBS / TV Tokyo",
    country: "Japan",
    airedFrom: "Oct 2020",
    airedTo: "Present",
    broadcast: "Fridays 11:00 PM JST",
    episodeDuration: "24 Min",
    releaseYear: 2019,
    languages: ["Japanese", "English", "Hindi"],
  },
  imageUrl: poster("jujutsu-kaisen"),
  backdropUrl: poster("jujutsu-kaisen"),
  matchScore: 93,
  engagementStats: [
    { id: "likes", label: "Liked By", value: "34k" },
    { id: "watching", label: "Currently Watching", value: "18.4K" },
    { id: "views", label: "Viewed By", value: "2.4M" },
    { id: "collections", label: "Included in Collections", value: "9.8k" },
  ],
  seasons: [
    { id: "s1", label: "Season 1", seasonNumber: 1, episodeCount: 24 },
    { id: "s2", label: "Season 2", seasonNumber: 2, episodeCount: 23 },
    { id: "movie", label: "Movie", seasonNumber: 0, episodeCount: 1 },
  ],
  episodes: jjkEpisodes,
  characters: jjkCharacters,
  featuredOsts: jjkOsts,
  relatedContent: [],
  collections: [],
  communities: [],
  reviews: jjkReviews,
  watchProgress: {
    seasonNumber: 1,
    episodeNumber: 7,
    episodeTitle: "Assault",
  },
};

async function findContentItem(contentId: string): Promise<ContentItem | null> {
  const slug = normalizeContentSlug(contentId);
  return getContentItemBySlug(slug);
}

function makeCollectionsForContent(contentId: string): Collection[] {
  const accents = ["green", "purple", "pink", "cyan", "yellow", "blue"] as const;
  const slugs = [
    "death-note",
    "code-geass",
    "demon-slayer",
    "attack-on-titan",
    "chainsaw-man",
    "vinland-saga",
  ];
  const names = [
    "Anime Masterpieces",
    "Dark Fantasy Picks",
    "MAPPA Favorites",
    "Shonen Legends",
    "Action Night Queue",
    "Curse & Combat",
  ];
  return accents.map((accent, i) => ({
    id: `${contentId}-col-${i + 1}`,
    name: names[i],
    description: "The greatest anime I've ever watched — curated for your taste.",
    itemCount: 42 + i * 3,
    favoriteCount: 16 + i * 2,
    visibility: "public" as const,
    createdAt: "10 Jan, 2026",
    updatedAt: `${i + 1} hrs ago`,
    accent,
    imageUrl: poster(slugs[i]),
  }));
}

function makeCommunitiesForContent(title: string): Community[] {
  const accents = ["yellow", "cyan", "purple", "pink"] as const;
  const names = [
    `${title} Anime Community`,
    "Gojo Satoru Fan Club",
    "Jujutsu Sorcerers Hub",
    "Cursed Energy Theorists",
  ];
  return accents.map((accent, i) => ({
    id: `comm-${i + 1}`,
    name: names[i],
    category: "Anime",
    memberCount: 42000 - i * 5000,
    postCount: 1248 - i * 200,
    visibility: "public" as const,
    activityLevel: i === 0 ? "very-active" : "active",
    avgMatchScore: 96 - i,
    lastActiveAt: `${i + 1} hrs Ago`,
    accent,
    imageUrl: poster("jujutsu-kaisen"),
  }));
}

function buildDetailFromItem(
  item: ContentItem,
  related: ContentItem[],
): ContentDetail {
  const slug = item.id.replace(/-t$/, "");
  const description =
    item.description ??
    `${item.title} follows a gripping story of conflict and survival, as its cast faces rising stakes, sharp animation, and emotional twists across every season. Discover episodes, characters, soundtracks, and fan communities curated for your taste. Watch trailers, track your progress, and join discussions with fans who share your genres and ratings on AniVerse. ${item.title} stands out with sharp pacing, layered characters, and set pieces that fans revisit on AniVerse.`;
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    rating: item.rating ?? 8.5,
    trendingLabel: `Trending on AniVerse · ${item.type}`,
    genres: item.genres,
    description,
    synopsis: description,
    referenceUrl: buildContentReferenceUrl(item.type, item.title, item.year),
    highlightTags: [],
    metadata: {
      imdbRating: item.rating ?? 8.5,
      malScore: (item.rating ?? 8.5) - 0.4,
      ageRating: "16+",
      status: "Completed",
      studio: "MAPPA",
      director: "Sunghoo Park",
      composer: "Yoshimasa Terui",
      originalAuthor: "Original Creator",
      sourceMaterial: item.type === "anime" ? "Manga" : "Original",
      producers: "MAPPA",
      network: "TV Tokyo",
      country: "Japan",
      airedFrom: item.year ? `Jan ${item.year}` : "Jan 2020",
      airedTo: "Present",
      broadcast: "Fridays 8:00 PM JST",
      episodeDuration: "24 Min",
      releaseYear: item.year ?? 2020,
      languages: ["Japanese", "English"],
    },
    imageUrl: item.imageUrl ?? poster(slug),
    backdropUrl: item.imageUrl ?? poster(slug),
    matchScore: item.matchScore ?? 90,
    accent: "blue",
    engagementStats: [
      { id: "likes", label: "Liked By", value: "12k" },
      { id: "watching", label: "Currently Watching", value: "8.2k" },
      { id: "views", label: "Viewed By", value: "840k" },
      { id: "collections", label: "Included in Collections", value: "3.1k" },
    ],
    seasons: [{ id: "s1", label: "Season 1", seasonNumber: 1, episodeCount: 12 }],
    episodes: Array.from({ length: 9 }, (_, i) => ({
      id: `${item.id}-ep-${i + 1}`,
      seasonNumber: 1,
      number: i + 1,
      title: i === 0 ? "Pilot" : `Episode ${i + 1}`,
      duration: "24m",
      description: `Episode ${i + 1} of ${item.title} — the story continues with higher stakes and sharper animation.`,
      thumbnailUrl: item.imageUrl ?? poster(slug),
      language: "Japanese",
      views: `${(2.4 - i * 0.15).toFixed(1)}M`,
      likes: `${15 - i}k`,
      rating: 8.5 + (i % 3) * 0.2,
    })),
    characters: jjkCharacters.map((c, i) => ({
      ...c,
      id: `${item.id}-char-${i}`,
      imageUrl: item.imageUrl ?? poster(slug),
    })),
    featuredOsts: jjkOsts.map((t) => ({ ...t, source: item.title })),
    relatedContent: related.filter((r) => r.id !== item.id).slice(0, 8),
    collections: makeCollectionsForContent(item.id),
    communities: makeCommunitiesForContent(item.title),
    reviews: jjkReviews.map((r, i) => ({
      ...r,
      id: `${item.id}-review-${i}`,
    })),
  };
}

/** Resolve full content detail by ID — DB first, mock fallback. */
export async function getContentDetail(
  contentId: string,
  viewerUserId?: string,
): Promise<ContentDetail | null> {
  const slug = normalizeContentSlug(contentId);
  const record = await getContentRecordBySlug(slug);

  if (record) {
    const genreIds = record.genres.map((g) => g.genreId);
    const genreLabels = record.genres.map((g) => g.genre.label);
    const needsRelatedFallback = record.relatedFrom.length === 0;

    const [engagement, fallbackRelated, collections, communities, userReviews] =
      await Promise.all([
        getContentEngagementStats(record.id),
        needsRelatedFallback
          ? findSimilarContent(slug, genreIds, 12)
          : Promise.resolve([] as ContentItem[]),
        listCollectionsContainingContent(record.id),
        listCommunitiesForContent(record.id, {
          title: record.title,
          genreLabels,
          category: record.type === "ANIME" ? "Anime" : "Content",
        }),
        getUserReviewsForTarget("content", slug, viewerUserId),
      ]);

    const detail = mapContentRecordToDetail(record, engagement, fallbackRelated);
    detail.collections = collections;
    detail.communities = communities;
    detail.reviews = mergeDisplayedReviews(userReviews, detail.reviews);
    return detail;
  }

  if (slug === "jujutsu-kaisen") {
    const related = (await getRecommendedContent(12)).filter(
      (item) => item.id !== "jujutsu-kaisen",
    );
    return {
      ...jjkDetail,
      relatedContent: related
        .filter((item) => item.id !== "jujutsu-kaisen")
        .slice(0, 10),
      collections: makeCollectionsForContent("jujutsu-kaisen"),
      communities: makeCommunitiesForContent("Jujutsu Kaisen"),
    };
  }

  const item = await findContentItem(slug);
  if (!item) return null;

  const related = (await getRecommendedContent(12)).filter(
    (item) => item.id !== slug,
  );
  return buildDetailFromItem(item, related);
}

/** List of known content IDs for static generation / sitemap. */
export async function getAllContentIds(): Promise<string[]> {
  return listAllContentSlugs();
}
