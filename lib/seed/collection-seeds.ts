import type { AccentColor } from "@/lib/catalog-enums";

export interface CollectionSeed {
  slug: string;
  ownerEmail: string;
  name: string;
  description: string;
  category: string;
  genreLabels: string[];
  kind: "content" | "music";
  visibility: "PUBLIC" | "PRIVATE";
  accent: AccentColor;
  favoriteCount: number;
  items?: string[];
  tracks?: string[];
}

export const REETAM_EMAIL = "reetam@entertainverse.local";

/** Public collections owned by Reetam Dutta — one per kind plus a mixed shelf. */
export const REETAM_COLLECTION_SEEDS: CollectionSeed[] = [
  {
    slug: "reetam-anime-essentials",
    ownerEmail: REETAM_EMAIL,
    name: "Anime Essentials",
    description:
      "Reetam's core anime rotation — psychological thrillers, modern shonen, and series worth a full binge on EntertainVerse.",
    category: "Anime",
    genreLabels: ["psychological", "action", "thriller"],
    kind: "content",
    visibility: "PUBLIC",
    accent: "blue",
    favoriteCount: 0,
    items: [
      "death-note",
      "jujutsu-kaisen",
      "demon-slayer",
      "attack-on-titan",
      "vinland-saga",
      "classroom-of-the-elite",
    ],
  },
  {
    slug: "reetam-show-binge-list",
    ownerEmail: REETAM_EMAIL,
    name: "Global Show Binge List",
    description:
      "Prestige and thriller series from Netflix and beyond — perfect for weekend marathons and community watch parties.",
    category: "Shows",
    genreLabels: ["thriller", "drama", "mystery"],
    kind: "content",
    visibility: "PUBLIC",
    accent: "cyan",
    favoriteCount: 0,
    items: [
      "money-heist",
      "alice-in-borderland",
      "squid-game",
      "stranger-things",
      "breaking-bad",
      "dark",
    ],
  },
  {
    slug: "reetam-cinema-picks",
    ownerEmail: REETAM_EMAIL,
    name: "Cinema Picks",
    description:
      "Feature films with sharp direction and rewatch value — from sci-fi mind-benders to award-winning international cinema.",
    category: "Movies",
    genreLabels: ["drama", "sci-fi", "thriller"],
    kind: "content",
    visibility: "PUBLIC",
    accent: "purple",
    favoriteCount: 0,
    items: [
      "inception",
      "interstellar",
      "parasite",
      "train-to-busan",
      "the-irishman",
      "bird-box",
    ],
  },
  {
    slug: "reetam-music-queue",
    ownerEmail: REETAM_EMAIL,
    name: "Music Queue",
    description:
      "Tracks on repeat — K-pop hits, global pop, and OST-adjacent singles pulled from the EntertainVerse catalog.",
    category: "Music",
    genreLabels: ["kpop", "pop", "electronic"],
    kind: "music",
    visibility: "PUBLIC",
    accent: "fuchsia",
    favoriteCount: 0,
    tracks: [
      "bts-dynamite",
      "bts-butter",
      "blackpink-pink-venom",
      "twice-feel-special",
      "newjeans-super-shy",
      "coldplay-yellow",
      "the-weeknd-blinding-lights",
    ],
  },
  {
    slug: "reetam-mixed-universe",
    ownerEmail: REETAM_EMAIL,
    name: "Mixed Universe",
    description:
      "Cross-format favorites — anime, live-action, film, and music in one public shelf for anyone exploring Reetam's taste.",
    category: "Mixed",
    genreLabels: ["action", "thriller", "kpop"],
    kind: "content",
    visibility: "PUBLIC",
    accent: "green",
    favoriteCount: 0,
    items: [
      "death-note",
      "money-heist",
      "inception",
      "jujutsu-kaisen",
      "squid-game",
    ],
    tracks: ["bts-dynamite", "twice-feel-special", "arijit-singh-kesariya"],
  },
];

export function generateCollectionSeeds(): CollectionSeed[] {
  return REETAM_COLLECTION_SEEDS;
}
