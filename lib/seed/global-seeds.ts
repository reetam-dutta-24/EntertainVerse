import type { AccentColor } from "@/lib/catalog-enums";
import type { CollectionSeed } from "@/lib/seed/collection-seeds";

export interface CommunitySeed {
  slug: string;
  ownerEmail: string;
  name: string;
  description: string;
  category: string;
  visibility: "PUBLIC" | "PRIVATE";
  activityLevel: "very-active" | "active" | "moderate" | "quiet";
  accent: AccentColor;
  posts?: { title: string; content: string }[];
}

/** Public global collections owned by other users — not Reetam's shelves. */
export const GLOBAL_COLLECTION_SEEDS: CollectionSeed[] = [
  {
    slug: "aisha-kdrama-vault",
    ownerEmail: "aisha@entertainverse.local",
    name: "K-Drama Vault",
    description:
      "Aisha's curated K-drama and global series picks — romance, thriller, and binge-worthy finales.",
    category: "Shows",
    genreLabels: ["drama", "romance", "thriller"],
    kind: "content",
    visibility: "PUBLIC",
    accent: "pink",
    favoriteCount: 0,
    items: ["squid-game", "alice-in-borderland", "dark", "stranger-things"],
  },
  {
    slug: "vikram-cinephile-list",
    ownerEmail: "vikram@entertainverse.local",
    name: "Cinephile Shortlist",
    description:
      "Vikram's public film shelf — prestige cinema, sci-fi, and rewatch essentials from around the world.",
    category: "Movies",
    genreLabels: ["drama", "sci-fi", "thriller"],
    kind: "content",
    visibility: "PUBLIC",
    accent: "indigo",
    favoriteCount: 0,
    items: ["parasite", "inception", "interstellar", "train-to-busan", "the-irishman"],
  },
  {
    slug: "aisha-global-pop-playlist",
    ownerEmail: "aisha@entertainverse.local",
    name: "Global Pop Rotation",
    description: "Cross-language pop and electronic singles Aisha keeps on repeat.",
    category: "Music",
    genreLabels: ["pop", "electronic", "english"],
    kind: "music",
    visibility: "PUBLIC",
    accent: "rose",
    favoriteCount: 0,
    tracks: ["coldplay-yellow", "the-weeknd-blinding-lights", "newjeans-super-shy"],
  },
  {
    slug: "vikram-anime-night",
    ownerEmail: "vikram@entertainverse.local",
    name: "Anime Night Picks",
    description: "Community-friendly anime starters Vikram recommends for watch parties.",
    category: "Anime",
    genreLabels: ["action", "fantasy", "psychological"],
    kind: "content",
    visibility: "PUBLIC",
    accent: "violet",
    favoriteCount: 0,
    items: ["demon-slayer", "jujutsu-kaisen", "spy-x-family", "vinland-saga"],
  },
  {
    slug: "global-mixed-discoveries",
    ownerEmail: "vikram@entertainverse.local",
    name: "Global Discoveries",
    description: "Mixed-format public shelf for titles you may not have explored yet.",
    category: "Mixed",
    genreLabels: ["thriller", "pop", "drama"],
    kind: "content",
    visibility: "PUBLIC",
    accent: "teal",
    favoriteCount: 0,
    items: ["elite", "money-heist", "death-note", "bird-box"],
  },
];

export const GLOBAL_COMMUNITY_SEEDS: CommunitySeed[] = [
  {
    slug: "demon-slayer-corps",
    ownerEmail: "aisha@entertainverse.local",
    name: "Demon Slayer Corps",
    description:
      "Celebrate Demon Slayer: Kimetsu no Yaiba — arcs, battles, breathing styles, and weekly episode threads.",
    category: "Anime",
    visibility: "PUBLIC",
    activityLevel: "active",
    accent: "green",
    posts: [
      {
        title: "Infinity Castle hype thread",
        content: "Which battle are you most excited to see animated next?",
      },
    ],
  },
  {
    slug: "netflix-thriller-club",
    ownerEmail: "vikram@entertainverse.local",
    name: "Netflix Thriller Club",
    description:
      "Money Heist, Elite, Alice in Borderland, and every prestige thriller worth debating.",
    category: "Shows",
    visibility: "PUBLIC",
    activityLevel: "very-active",
    accent: "red",
    posts: [
      {
        title: "Elite season ranking",
        content: "Drop your hottest takes on the best and worst seasons of Elite.",
      },
    ],
  },
  {
    slug: "kpop-chart-room",
    ownerEmail: "aisha@entertainverse.local",
    name: "K-Pop Chart Room",
    description: "TWICE, BTS, BLACKPINK, NewJeans — comebacks, playlists, and fan picks.",
    category: "Music",
    visibility: "PUBLIC",
    activityLevel: "active",
    accent: "fuchsia",
    posts: [
      {
        title: "Current comeback rotation",
        content: "What tracks are on your repeat playlist this week?",
      },
    ],
  },
  {
    slug: "prestige-cinema-society",
    ownerEmail: "vikram@entertainverse.local",
    name: "Prestige Cinema Society",
    description: "Feature films, directors, and soundtracks — from Parasite to Interstellar.",
    category: "Movies",
    visibility: "PUBLIC",
    activityLevel: "moderate",
    accent: "purple",
    posts: [
      {
        title: "Rewatch-worthy endings",
        content: "Which movie finale still hits you on the second watch?",
      },
    ],
  },
  {
    slug: "isekai-explorers",
    ownerEmail: "aisha@entertainverse.local",
    name: "Isekai Explorers",
    description: "Portal fantasy, game worlds, and the best isekai recommendations on EntertainVerse.",
    category: "Anime",
    visibility: "PUBLIC",
    activityLevel: "moderate",
    accent: "cyan",
    posts: [
      {
        title: "Gateway isekai picks",
        content: "Name the series you'd recommend to a first-time isekai viewer.",
      },
    ],
  },
];
