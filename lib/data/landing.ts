import type {
  Collection,
  Community,
  ContentItem,
  Review,
  StatMetric,
  UserSummary,
} from "@/types";

/**
 * Landing page data — static marketing content only.
 */

export interface LandingFeature {
  title: string;
  body: string;
}

const features: LandingFeature[] = [
  {
    title: "✨ AI Match",
    body: "Get content, songs, artists, and communities matched to your taste.",
  },
  {
    title: "🎧 Music Hub",
    body: "Find OSTs, K-pop, J-pop, artists, albums, and playlists.",
  },
  {
    title: "🎬 Discover",
    body: "Explore anime, movies, shows, K-dramas, and trending titles.",
  },
  {
    title: "📁 Collections",
    body: "Organize your favorites into smart personal collections.",
  },
  {
    title: "💬 Communities",
    body: "Join fandoms, chats, watch rooms, and discussions.",
  },
  {
    title: "📊 Analytics",
    body: "Track your watching, listening, genres, and taste patterns.",
  },
  {
    title: "🎯 Watchlist",
    body: "Save anime, shows, movies, and songs you want to explore later.",
  },
  {
    title: "👤 Taste Profile",
    body: "Build a personalized profile from your watching, listening, and community activity.",
  },
];

const spotlightContent: ContentItem = {
  id: "jjk",
  title: "Jujutsu Kaisen",
  type: "anime",
  imageUrl: "/images/poster-jjk.png",
  genres: [
    { id: "action", label: "Action" },
    { id: "thriller", label: "Thriller" },
  ],
  matchScore: 93,
  description:
    "A dark action anime where cursed energy, brutal battles, and powerful sorcerers collide as a student is pulled into a world .....",
  meta: "4 Seasons",
  year: 2019,
};

const spotlightMusic: ContentItem = {
  id: "swim",
  title: "Swim",
  type: "song",
  imageUrl: "/images/album-swim.png",
  genres: [{ id: "english", label: "English" }],
  rating: 9.2,
  matchScore: 87,
  meta: "Chase Atlantic",
};

const featuredCommunity: Community = {
  id: "reetam",
  name: "Reetam Dutta’s Anime Community",
  category: "Anime",
  memberCount: 42000,
  postCount: 1248,
  visibility: "private",
  activityLevel: "very-active",
  avgMatchScore: 96,
  lastActiveAt: "2 hrs Ago",
  accent: "cyan",
};

const featuredCommunityMembers: UserSummary[] = [
  { id: "r1", name: "Reetam" },
  { id: "r2", name: "Ria" },
  { id: "r3", name: "Rahul" },
];

const featuredCollection: Collection = {
  id: "music-playlist",
  name: "Music Playlist",
  itemCount: 42,
  favoriteCount: 16,
  description: "The greatest anime I've ever watched.",
  visibility: "public",
  createdAt: "10 Jan, 2026",
  updatedAt: "2 hrs ago",
  accent: "blue",
};

const trendingCommunities: Community[] = [
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
    id: "money-heist",
    name: "Money Heist Fanclub",
    category: "Show",
    memberCount: 30000,
    postCount: 1248,
    visibility: "public",
    activityLevel: "active",
    avgMatchScore: 96,
    createdAt: "23rd Aug, 2025",
    accent: "green",
  },
  {
    id: "pop-lounge",
    name: "Pop Music Lounge",
    category: "Pop",
    memberCount: 55000,
    postCount: 1248,
    visibility: "public",
    activityLevel: "active",
    avgMatchScore: 96,
    createdAt: "23rd Aug, 2025",
    accent: "cyan",
  },
  {
    id: "global-anime",
    name: "Global Anime Community",
    category: "Anime",
    memberCount: 40000,
    postCount: 1248,
    visibility: "public",
    activityLevel: "moderate",
    avgMatchScore: 96,
    createdAt: "23rd Aug, 2025",
    accent: "purple",
  },
];

const featuredReviews: Review[] = [
  {
    id: "lr-1",
    author: { id: "u-aki", name: "Akira Tan", avatarColor: "#00e5ff" },
    rating: 10,
    content:
      "EntertainVerse's AI match is scary good. It recommended Vinland Saga after my Berserk binge and now it's my favorite anime of all time.",
    likeCount: 3120,
    createdAt: "4 Jul, 2026",
    accent: "cyan",
  },
  {
    id: "lr-2",
    author: { id: "u-mina", name: "Mina Park", avatarColor: "#ff00cc" },
    rating: 9,
    content:
      "Finally one app for my K-pop playlists AND my K-drama watchlist. The TWICE Fanverse community feels like home — chat is always alive.",
    likeCount: 2480,
    createdAt: "28 Jun, 2026",
    accent: "pink",
  },
  {
    id: "lr-3",
    author: { id: "u-leo", name: "Leo Fernandez", avatarColor: "#ffd000" },
    rating: 9,
    content:
      "The watch rooms are a game changer. Synced Money Heist rewatch with 40 strangers who are now friends. Collections keep everything organized.",
    likeCount: 1870,
    createdAt: "21 Jun, 2026",
    accent: "yellow",
  },
  {
    id: "lr-4",
    author: { id: "u-yuki", name: "Yuki Sato", avatarColor: "#9d4bff" },
    rating: 10,
    content:
      "My taste profile analytics blew my mind — 214 hours of OSTs tracked, genre patterns I never noticed. EntertainVerse knows me better than I do.",
    likeCount: 2940,
    createdAt: "15 Jun, 2026",
    accent: "purple",
  },
  {
    id: "lr-5",
    author: { id: "u-sara", name: "Sara Ahmed", avatarColor: "#22e584" },
    rating: 9,
    content:
      "Went from lurking to running a 5K-member fandom in two months. The community dashboard with posts, announcements, and stats is pure product depth.",
    likeCount: 1640,
    createdAt: "9 Jun, 2026",
    accent: "green",
  },
  {
    id: "lr-6",
    author: { id: "u-dev", name: "Dev Malhotra", avatarColor: "#4b7bff" },
    rating: 10,
    content:
      "Global search across anime, songs, artists, and communities in one bar — instant results. This is what every entertainment app should feel like.",
    likeCount: 2210,
    createdAt: "2 Jun, 2026",
    accent: "blue",
  },
];

const tasteStats: StatMetric[] = [
  { id: "watched", label: "🎬 Content Watched", value: "186" },
  { id: "listened", label: "🎵 Music Listened", value: "214 h" },
  { id: "communities", label: "👥 Communities Joined", value: "24" },
  { id: "collections", label: "📒 Collections Created", value: "18" },
  { id: "reviews", label: "✍️ Reviews Written", value: "57" },
  { id: "artists", label: "🎤 Artists Followed", value: "36" },
];

/** Static landing-page exports — never fetch from DB or authenticated APIs. */
export const LANDING_FEATURES = features;
export const LANDING_SPOTLIGHT_CONTENT = spotlightContent;
export const LANDING_SPOTLIGHT_MUSIC = spotlightMusic;
export const LANDING_FEATURED_COMMUNITY = featuredCommunity;
export const LANDING_FEATURED_COMMUNITY_MEMBERS = featuredCommunityMembers;
export const LANDING_FEATURED_COLLECTION = featuredCollection;
export const LANDING_TRENDING_COMMUNITIES = trendingCommunities;
export const LANDING_FEATURED_REVIEWS = featuredReviews;
export const LANDING_TASTE_STATS = tasteStats;

export async function getLandingFeatures(): Promise<LandingFeature[]> {
  return features;
}

export async function getSpotlightContent(): Promise<{
  content: ContentItem;
  music: ContentItem;
}> {
  return {
    content: spotlightContent,
    music: spotlightMusic,
  };
}

export async function getFeaturedCommunity(): Promise<{
  community: Community;
  members: UserSummary[];
}> {
  return { community: featuredCommunity, members: featuredCommunityMembers };
}

export async function getFeaturedCollection(): Promise<Collection> {
  return featuredCollection;
}

export async function getTrendingCommunities(): Promise<Community[]> {
  return trendingCommunities;
}

export async function getFeaturedReviews(): Promise<Review[]> {
  return featuredReviews;
}

export async function getTasteStats(): Promise<StatMetric[]> {
  return tasteStats;
}
