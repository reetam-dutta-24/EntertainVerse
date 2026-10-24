/**
 * Fill a real account with lived-in activity so every dashboard page has data:
 * collections, favourites, follows, watchlist, reviews, ratings, communities,
 * posts, chat, friends, DMs and a year of watch/listen history.
 *
 * Goes through the app's own services (so counters, follower counts and
 * notifications stay consistent) and is safe to re-run — every step checks the
 * current state first.
 *
 *   npx tsx --conditions=react-server --env-file=.env --env-file=.env.local \
 *     scripts/seed-active-profile.ts rdutta_be23@thapar.edu
 */
import { prisma } from "@/lib/prisma";
import { collectionFormSchema } from "@/lib/validators/collection";
import { communityPostFormSchema } from "@/lib/validators/community";
import { reviewFormSchema } from "@/lib/validators/review";
import { createCollection } from "@/lib/services/collection.service";
import { isCollectionFollowed, toggleCollectionFollow } from "@/lib/services/collection-follow.service";
import {
  isArtistFavorited,
  isCollectionFavorited,
  isContentFavorited,
  isTrackFavorited,
  toggleArtistFavorite,
  toggleCollectionFavorite,
  toggleContentFavorite,
  toggleTrackFavorite,
} from "@/lib/services/favorite.service";
import { isArtistFollowed, toggleArtistFollow } from "@/lib/services/artist-follow.service";
import { addWatchlistItem, isContentOnWatchlist } from "@/lib/services/watchlist.service";
import { createCommunityPost, joinCommunity } from "@/lib/services/community.service";
import { createCommunityChatMessage } from "@/lib/services/community-chat.service";
import { createReview, ReviewConflictError } from "@/lib/services/review.service";
import { acceptFriendRequest, getViewerFriendStatus, toggleUserFollow } from "@/lib/services/follow.service";
import { sendDirectMessage } from "@/lib/services/dm.service";
import type { ReviewTargetType } from "@/lib/review-routes";

const email = process.argv[2] ?? "rdutta_be23@thapar.edu";

const FAVORITE_CONTENT = [
  "attack-on-titan", "jujutsu-kaisen", "breaking-bad", "dark", "arcane", "alice-in-borderland",
  "death-note", "money-heist", "vinland-saga", "demon-slayer", "the-dark-knight", "squid-game",
];
const FAVORITE_TRACKS = [
  "twice-feel-special", "twice-the-feels", "twice-what-is-love", "newjeans-hype-boy",
  "the-weeknd-blinding-lights", "coldplay-yellow", "oneokrock-wherever-you-are",
  "elite-forever-young", "fifty-shades-earned-it", "bts-spring-day",
];
const FAVORITE_ARTISTS = ["twice", "newjeans", "the-weeknd", "coldplay", "oneokrock"];
const FOLLOW_ARTISTS = ["twice", "newjeans", "bts", "the-weeknd", "oneokrock", "coldplay", "arijit-singh"];

const WATCHLIST: { slug: string; status: "PENDING" | "WATCHING" | "COMPLETED" | "DROPPED"; priority: "NORMAL" | "HIGH" }[] = [
  { slug: "breaking-bad", status: "WATCHING", priority: "HIGH" },
  { slug: "the-last-of-us", status: "WATCHING", priority: "NORMAL" },
  { slug: "jujutsu-kaisen", status: "WATCHING", priority: "HIGH" },
  { slug: "dark", status: "PENDING", priority: "HIGH" },
  { slug: "mindhunter", status: "PENDING", priority: "HIGH" },
  { slug: "vinland-saga", status: "PENDING", priority: "NORMAL" },
  { slug: "stranger-things", status: "PENDING", priority: "NORMAL" },
  { slug: "death-note", status: "COMPLETED", priority: "NORMAL" },
  { slug: "attack-on-titan", status: "COMPLETED", priority: "NORMAL" },
  { slug: "squid-game", status: "COMPLETED", priority: "NORMAL" },
  { slug: "money-heist", status: "COMPLETED", priority: "NORMAL" },
  { slug: "13-reasons-why", status: "DROPPED", priority: "NORMAL" },
];

const COLLECTIONS = [
  {
    name: "Thriller Binge Weekend",
    description: "Edge-of-the-seat shows I'd rewatch in one sitting.",
    category: "Shows", kind: "content", visibility: "PUBLIC", accent: "red",
    genreLabels: ["thriller", "crime", "mystery"],
    initialContentSlugs: ["breaking-bad", "dark", "money-heist", "mindhunter", "alice-in-borderland", "squid-game", "narcos", "the-night-agent"],
  },
  {
    name: "Shonen Hype Train",
    description: "Peak fights, peak soundtracks, zero filler.",
    category: "Anime", kind: "content", visibility: "PUBLIC", accent: "purple",
    genreLabels: ["action", "fantasy", "supernatural"],
    initialContentSlugs: ["jujutsu-kaisen", "attack-on-titan", "demon-slayer", "vinland-saga", "naruto-shippuden", "dragon-ball-z", "haikyuu", "blue-lock"],
  },
  {
    name: "Late Night OST Rotation",
    description: "Soundtracks and slow songs for 2am study sessions.",
    category: "Music", kind: "music", visibility: "PUBLIC", accent: "indigo",
    genreLabels: ["ost", "ballad", "pop"],
    initialTrackSlugs: ["elite-forever-young", "elite-never-far-behind", "fifty-shades-earned-it", "fifty-shades-love-me-like-you-do", "coldplay-fix-you", "the-weeknd-die-for-you", "oneokrock-wherever-you-are"],
  },
  {
    name: "K-Pop On Repeat",
    description: "TWICE first, everything else after.",
    category: "Music", kind: "music", visibility: "PUBLIC", accent: "pink",
    genreLabels: ["kpop", "pop"],
    initialTrackSlugs: ["twice-feel-special", "twice-the-feels", "twice-what-is-love", "twice-set-me-free", "newjeans-hype-boy", "newjeans-ditto", "bts-spring-day", "blackpink-how-you-like-that"],
  },
  {
    name: "Mind-Benders To Watch Next",
    description: "Private shortlist — sci-fi and psychological picks.",
    category: "Mixed", kind: "content", visibility: "PRIVATE", accent: "cyan",
    genreLabels: ["sci-fi", "psychological"],
    initialContentSlugs: ["inception", "interstellar", "dark", "the-matrix", "blade-runner-2049", "death-parade"],
  },
] as const;

const COMMUNITIES = [
  "jujutsu-kaisen-sorcerers", "attack-on-titan-survey-corps", "netflix-thriller-club", "anime-ost-collectors",
  "twice-once-global", "psychological-thriller-lounge", "shonen-power-hour", "aniverse-global-lounge",
];

const POSTS = [
  { community: "jujutsu-kaisen-sorcerers", title: "Gojo vs Sukuna rewatch thread", content: "Rewatched the Shibuya arc this weekend — the animation in episode 17 is still unreal. Which fight is your favourite?", image: "jujutsu-kaisen" },
  { community: "netflix-thriller-club", title: "Dark vs Alice in Borderland — which twist hit harder?", content: "Finished both back to back. Dark's family tree broke my brain, but Borderland's final game had me yelling.", image: "dark" },
  { community: "anime-ost-collectors", title: "My late-night OST rotation is up", content: "Made a public collection of the soundtracks I study to. Drop your must-add tracks below!", image: "attack-on-titan" },
];

const CHAT = [
  { community: "jujutsu-kaisen-sorcerers", content: "Anyone else hyped for the next season announcement? 🔥" },
  { community: "twice-once-global", content: "Feel Special still hits every single time 💖" },
  { community: "aniverse-global-lounge", content: "Just joined — looking for thriller and shonen recs!" },
];

const REVIEWS: { target: ReviewTargetType; slug: string; rating: number; headline: string; body: string }[] = [
  { target: "content", slug: "attack-on-titan", rating: 9.5, headline: "A masterpiece of escalation", body: "Every season raises the stakes without losing the characters. The final act divides people, but the ride there is unmatched." },
  { target: "content", slug: "breaking-bad", rating: 10, headline: "Perfect character arc", body: "Walter White's transformation is paced flawlessly. Not a single wasted episode." },
  { target: "content", slug: "alice-in-borderland", rating: 8.5, headline: "Tense, stylish survival thriller", body: "The games are genuinely clever and the second season deepens the mystery. Great binge." },
  { target: "content", slug: "jujutsu-kaisen", rating: 9, headline: "Best fight choreography in modern anime", body: "MAPPA went all out — Shibuya arc is a showcase. The OPs are elite too." },
  { target: "song", slug: "twice-feel-special", rating: 9, headline: "Comfort song forever", body: "The chorus lifts every time. One of TWICE's most heartfelt title tracks." },
  { target: "artist", slug: "twice", rating: 9.5, headline: "Consistently great", body: "From Cheer Up to Set Me Free — TWICE keep evolving without losing their sparkle." },
  { target: "community", slug: "jujutsu-kaisen-sorcerers", rating: 9, headline: "Friendly and active", body: "Great theory threads and zero toxicity. Best place to talk JJK." },
];

const RATINGS: Record<string, number> = {
  "attack-on-titan": 9.5, "breaking-bad": 10, "dark": 9, "death-note": 9, "jujutsu-kaisen": 9,
  "alice-in-borderland": 8.5, "money-heist": 8, "squid-game": 8, "demon-slayer": 8.5, "arcane": 9.5,
  "the-dark-knight": 9.5, "vinland-saga": 9, "13-reasons-why": 5.5, "interstellar": 9,
};

/** Watch minutes per month (index 0 = this month … 11 = a year ago). */
const WATCH_HISTORY: Record<string, number[]> = {
  "breaking-bad": [180, 140, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "jujutsu-kaisen": [120, 90, 150, 60, 0, 0, 0, 40, 0, 0, 0, 0],
  "the-last-of-us": [110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "attack-on-titan": [0, 60, 200, 240, 180, 0, 0, 0, 0, 0, 0, 0],
  "death-note": [0, 0, 0, 0, 120, 210, 160, 0, 0, 0, 0, 0],
  "squid-game": [0, 0, 0, 0, 0, 0, 140, 220, 90, 0, 0, 0],
  "money-heist": [0, 0, 0, 0, 0, 0, 0, 0, 160, 240, 200, 0],
  "alice-in-borderland": [60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 130, 210],
  "arcane": [0, 0, 0, 0, 0, 90, 0, 0, 0, 0, 0, 150],
  "inception": [0, 0, 148, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "the-dark-knight": [0, 0, 0, 0, 0, 0, 0, 0, 0, 152, 0, 0],
  "planet-earth-iii": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 0],
};
const LISTEN_HISTORY: Record<string, number[]> = {
  "twice-feel-special": [40, 35, 30, 45, 38, 42, 30, 28, 35, 40, 30, 25],
  "twice-the-feels": [25, 30, 20, 22, 30, 25, 20, 18, 22, 25, 20, 15],
  "newjeans-hype-boy": [30, 25, 28, 20, 0, 0, 0, 0, 0, 0, 0, 0],
  "the-weeknd-blinding-lights": [20, 18, 22, 25, 28, 30, 26, 20, 18, 15, 12, 10],
  "coldplay-yellow": [12, 10, 15, 0, 0, 18, 20, 22, 0, 0, 0, 0],
  "elite-forever-young": [22, 28, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "fifty-shades-earned-it": [15, 12, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0],
  "oneokrock-wherever-you-are": [18, 0, 0, 20, 24, 0, 0, 16, 0, 0, 0, 0],
  "bts-spring-day": [0, 12, 15, 0, 0, 14, 0, 0, 12, 0, 0, 0],
  "arijit-singh-tum-hi-ho": [0, 0, 0, 10, 12, 0, 15, 0, 0, 0, 10, 0],
};

const FRIENDS_I_REQUEST = ["aisha_khan"]; // they accept
const FRIENDS_WHO_REQUEST_ME = ["vikram_patel"]; // I accept
const PENDING_INCOMING = ["reetam_dutta"]; // left pending so the request UI has something
const DMS: { with: string; fromMe: boolean; content: string }[] = [
  { with: "aisha_khan", fromMe: false, content: "Hey! Saw your Thriller Binge Weekend collection — adding Mindhunter to my list 👀" },
  { with: "aisha_khan", fromMe: true, content: "You have to! Season 2 is even better. Have you watched Dark yet?" },
  { with: "aisha_khan", fromMe: false, content: "Not yet, starting it this weekend. No spoilers 😤" },
  { with: "vikram_patel", fromMe: false, content: "Joining the JJK watch thread tonight?" },
  { with: "vikram_patel", fromMe: true, content: "Yes! I'll bring the Shibuya arc hot takes 🔥" },
];

function monthDate(monthOffset: number, day: number, hour: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - monthOffset, Math.min(day, 28));
  date.setHours(hour, (day * 7) % 60, 0, 0);
  if (date > new Date()) date.setDate(Math.max(1, new Date().getDate() - 1));
  return date;
}

async function step(label: string, run: () => Promise<number>) {
  try {
    const changed = await run();
    console.log(`✓ ${label}: ${changed} added`);
  } catch (error) {
    console.log(`✗ ${label}: ${error instanceof Error ? error.message : error}`);
  }
}

async function main() {
  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, handle: true } });
  if (!me) throw new Error(`No account for ${email} — sign in once first.`);
  const userId = me.id;
  console.log(`Seeding activity for @${me.handle}`);

  await step("content favourites", async () => {
    let n = 0;
    for (const slug of FAVORITE_CONTENT) {
      if (!(await isContentFavorited(userId, slug))) { await toggleContentFavorite(userId, slug); n++; }
    }
    return n;
  });
  await step("track favourites", async () => {
    let n = 0;
    for (const slug of FAVORITE_TRACKS) {
      if (!(await isTrackFavorited(userId, slug))) { await toggleTrackFavorite(userId, slug); n++; }
    }
    return n;
  });
  await step("artist favourites", async () => {
    let n = 0;
    for (const slug of FAVORITE_ARTISTS) {
      if (!(await isArtistFavorited(userId, slug))) { await toggleArtistFavorite(userId, slug); n++; }
    }
    return n;
  });
  await step("artist follows", async () => {
    let n = 0;
    for (const slug of FOLLOW_ARTISTS) {
      if (!(await isArtistFollowed(userId, slug))) { await toggleArtistFollow(userId, slug); n++; }
    }
    return n;
  });

  await step("watchlist", async () => {
    let n = 0;
    for (const item of WATCHLIST) {
      if (await isContentOnWatchlist(userId, item.slug)) continue;
      await addWatchlistItem(userId, { contentSlug: item.slug, status: item.status, priority: item.priority });
      n++;
    }
    return n;
  });

  await step("own collections", async () => {
    let n = 0;
    for (const spec of COLLECTIONS) {
      const exists = await prisma.collection.findFirst({ where: { userId, name: spec.name }, select: { id: true } });
      if (exists) continue;
      await createCollection(userId, collectionFormSchema.parse(spec));
      n++;
    }
    return n;
  });

  await step("favourite + follow other public collections", async () => {
    const others = await prisma.collection.findMany({
      where: { visibility: "PUBLIC", userId: { not: userId } },
      orderBy: { favoriteCount: "desc" },
      take: 5,
      select: { slug: true },
    });
    let n = 0;
    for (const [index, { slug }] of others.entries()) {
      if (!(await isCollectionFavorited(userId, slug))) { await toggleCollectionFavorite(userId, slug); n++; }
      if (index < 3 && !(await isCollectionFollowed(userId, slug))) { await toggleCollectionFollow(userId, slug); n++; }
    }
    return n;
  });

  await step("communities joined", async () => {
    let n = 0;
    for (const slug of COMMUNITIES) {
      const community = await prisma.community.findUnique({ where: { slug }, select: { id: true } });
      if (!community) continue;
      const member = await prisma.communityMember.findUnique({ where: { userId_communityId: { userId, communityId: community.id } } });
      if (member) continue;
      await joinCommunity(userId, slug);
      n++;
    }
    return n;
  });

  await step("community posts", async () => {
    let n = 0;
    for (const post of POSTS) {
      const community = await prisma.community.findUnique({ where: { slug: post.community }, select: { id: true } });
      if (!community) continue;
      const exists = await prisma.communityPost.findFirst({ where: { communityId: community.id, authorId: userId, title: post.title } });
      if (exists) continue;
      const poster = await prisma.content.findUnique({ where: { slug: post.image }, select: { imageUrl: true } });
      await createCommunityPost(userId, post.community, communityPostFormSchema.parse({
        title: post.title,
        content: post.content,
        imageUrl: poster?.imageUrl ?? `/images/posters/${post.image}.jpg`,
      }));
      n++;
    }
    return n;
  });

  await step("community chat", async () => {
    let n = 0;
    for (const message of CHAT) {
      const community = await prisma.community.findUnique({ where: { slug: message.community }, select: { id: true } });
      if (!community) continue;
      const exists = await prisma.communityChatMessage.findFirst({ where: { communityId: community.id, authorId: userId, content: message.content } });
      if (exists) continue;
      await createCommunityChatMessage(userId, message.community, "GENERAL", { content: message.content });
      n++;
    }
    return n;
  });

  await step("reviews", async () => {
    let n = 0;
    for (const review of REVIEWS) {
      try {
        await createReview(userId, review.target, review.slug, reviewFormSchema.parse(review));
        n++;
      } catch (error) {
        // Already reviewed on a previous run — createReview refuses duplicates.
        if (!(error instanceof ReviewConflictError)) throw error;
      }
    }
    return n;
  });

  await step("ratings", async () => {
    let n = 0;
    for (const [slug, score] of Object.entries(RATINGS)) {
      const content = await prisma.content.findUnique({ where: { slug }, select: { id: true } });
      if (!content) continue;
      const existing = await prisma.rating.findUnique({
        where: { userId_contentId: { userId, contentId: content.id } },
        select: { id: true },
      });
      if (existing) continue;
      await prisma.rating.create({ data: { userId, contentId: content.id, score } });
      n++;
    }
    return n;
  });

  await step("watch + listen history", async () => {
    // Only seed once — a real history may already exist on top of this.
    const already = await prisma.watchEvent.count({ where: { userId } });
    if (already > 40) return 0;
    let n = 0;
    for (const [slug, months] of Object.entries(WATCH_HISTORY)) {
      const content = await prisma.content.findUnique({ where: { slug }, select: { id: true } });
      if (!content) continue;
      for (const [offset, minutes] of months.entries()) {
        if (!minutes) continue;
        // Split each month into a few sessions on different days and evening hours.
        const sessions = Math.max(1, Math.round(minutes / 50));
        for (let s = 0; s < sessions; s++) {
          await prisma.watchEvent.create({
            data: { userId, contentId: content.id, minutes: Math.round(minutes / sessions), watchedAt: monthDate(offset, 3 + s * 7 + (slug.length % 5), [20, 21, 22, 23, 15][(s + offset) % 5]!) },
          });
          n++;
        }
      }
    }
    for (const [slug, months] of Object.entries(LISTEN_HISTORY)) {
      const track = await prisma.musicTrack.findUnique({ where: { slug }, select: { id: true } });
      if (!track) continue;
      for (const [offset, minutes] of months.entries()) {
        if (!minutes) continue;
        await prisma.listenEvent.create({
          data: { userId, trackId: track.id, minutes, listenedAt: monthDate(offset, 5 + (slug.length % 20), [8, 13, 18, 23][offset % 4]!) },
        });
        n++;
      }
    }
    return n;
  });

  await step("friends", async () => {
    let n = 0;
    for (const handle of FRIENDS_I_REQUEST) {
      const friend = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
      if (!friend) continue;
      const { status } = await getViewerFriendStatus(userId, friend.id);
      if (status === "friends") continue;
      if (status === "none") await toggleUserFollow(userId, handle);
      const request = await prisma.friendRequest.findFirst({ where: { requesterId: userId, recipientId: friend.id, status: "PENDING" } });
      if (request) { await acceptFriendRequest(request.id, friend.id); n++; }
    }
    for (const handle of FRIENDS_WHO_REQUEST_ME) {
      const friend = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
      if (!friend) continue;
      const { status } = await getViewerFriendStatus(friend.id, userId);
      if (status === "friends") continue;
      if (status === "none") await toggleUserFollow(friend.id, me.handle);
      const request = await prisma.friendRequest.findFirst({ where: { requesterId: friend.id, recipientId: userId, status: "PENDING" } });
      if (request) { await acceptFriendRequest(request.id, userId); n++; }
    }
    for (const handle of PENDING_INCOMING) {
      const friend = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
      if (!friend) continue;
      const { status } = await getViewerFriendStatus(friend.id, userId);
      if (status === "none") { await toggleUserFollow(friend.id, me.handle); n++; }
    }
    return n;
  });

  await step("direct messages", async () => {
    let n = 0;
    for (const dm of DMS) {
      const other = await prisma.user.findUnique({ where: { handle: dm.with }, select: { id: true, handle: true } });
      if (!other) continue;
      const senderId = dm.fromMe ? userId : other.id;
      const exists = await prisma.directMessage.findFirst({ where: { senderId, content: dm.content } });
      if (exists) continue;
      await sendDirectMessage(senderId, dm.fromMe ? other.handle : me.handle, dm.content);
      n++;
    }
    return n;
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
