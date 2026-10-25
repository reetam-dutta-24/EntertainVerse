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
    title: "🎯 Picks with reasons",
    body: "Recommendations that blend your taste, what titles are about, and fans like you — each one says why.",
  },
  {
    title: "✨ AI Mode",
    body: "Take a quick taste quiz or just chat about your mood, and get explained picks instantly.",
  },
  {
    title: "🗺️ AI Roadmaps",
    body: "An ordered watch or listen plan that fits your weekly hours and ticks itself off as you go.",
  },
  {
    title: "🤝 AI Match",
    body: "Open a room and people whose taste matches yours get an invite — nearby or worldwide.",
  },
  {
    title: "🍿 Watch Together",
    body: "Synced watch and listen parties, voice talk rooms, and group picks that suit everyone.",
  },
  {
    title: "🧠 Catch Me Up",
    body: "Tell it where you stopped and get a spoiler-safe recap of only what you've seen.",
  },
  {
    title: "🧬 Taste DNA & Wrapped",
    body: "See how your taste shifts month by month, then share your Wrapped and AI persona.",
  },
  {
    title: "📁 Smart Collections",
    body: "Build public or private collections, and get weekly collection ideas from what you love.",
  },
  {
    title: "💬 Communities",
    body: "Fandoms with posts, reviews, and live chat — plus DMs with friends and matches.",
  },
  {
    title: "🎧 Music Hub",
    body: "OSTs, K-pop, J-pop, and artists, with official previews, lyrics, and listen links.",
  },
  {
    title: "🤖 Assistant",
    body: "Ask anything about the app, your stats, or the catalog — answers cite their sources.",
  },
  {
    title: "⏳ Your Time, Your Data",
    body: "Set a daily limit that locks at midnight, and see, edit, or wipe what the AI knows.",
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
  id: "late-night-osts",
  name: "Late-Night OSTs",
  itemCount: 42,
  favoriteCount: 16,
  description: "Soundtracks for the 2 a.m. rewatch.",
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
      "\"Because you loved Berserk\" — that one line got me to start Vinland Saga. Now it's my favorite anime of all time. The reasons make the picks.",
    likeCount: 3120,
    createdAt: "4 Jul, 2026",
    accent: "cyan",
  },
  {
    id: "lr-2",
    author: { id: "u-mina", name: "Mina Park", avatarColor: "#ff00cc" },
    rating: 9,
    content:
      "Told AI mode I had six hours a week and wanted something cozy. It built me a roadmap, and the steps tick off by themselves as I watch.",
    likeCount: 2480,
    createdAt: "28 Jun, 2026",
    accent: "pink",
  },
  {
    id: "lr-3",
    author: { id: "u-leo", name: "Leo Fernandez", avatarColor: "#ffd000" },
    rating: 9,
    content:
      "Synced Money Heist watch party with my community, voice room on the side. Group picks settled the 'what next' fight in ten seconds.",
    likeCount: 1870,
    createdAt: "21 Jun, 2026",
    accent: "yellow",
  },
  {
    id: "lr-4",
    author: { id: "u-yuki", name: "Yuki Sato", avatarColor: "#9d4bff" },
    rating: 10,
    content:
      "My Wrapped called me 'The Midnight Melancholic' and my Taste DNA showed a whole thriller era I'd forgotten. EntertainVerse knows me better than I do.",
    likeCount: 2940,
    createdAt: "15 Jun, 2026",
    accent: "purple",
  },
  {
    id: "lr-5",
    author: { id: "u-sara", name: "Sara Ahmed", avatarColor: "#22e584" },
    rating: 9,
    content:
      "Came back to Attack on Titan after a year. 'Catch me up' recapped exactly up to my episode — zero spoilers — and I was back in the same night.",
    likeCount: 1640,
    createdAt: "9 Jun, 2026",
    accent: "green",
  },
  {
    id: "lr-6",
    author: { id: "u-dev", name: "Dev Malhotra", avatarColor: "#4b7bff" },
    rating: 10,
    content:
      "Opened an AI Match room on a Friday night and three people with my exact taste joined in a minute. We've had a weekly listen party since.",
    likeCount: 2210,
    createdAt: "2 Jun, 2026",
    accent: "blue",
  },
];

const tasteStats: StatMetric[] = [
  { id: "watched", label: "🎬 Hours Watched", value: "186 h" },
  { id: "listened", label: "🎵 Hours Listened", value: "214 h" },
  { id: "fit", label: "🎯 Taste Fit", value: "92%" },
  { id: "eras", label: "🧬 Taste Eras", value: "4" },
  { id: "roadmap", label: "🗺️ Roadmap Steps Done", value: "23" },
  { id: "communities", label: "👥 Communities Joined", value: "12" },
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
