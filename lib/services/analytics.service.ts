import type { MediaType, WatchlistStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import { getAiProfileInsights } from "@/lib/services/ai-profile.service";
import { loadTasteCatalog, loadTasteSignals, tasteCentroids } from "@/lib/services/taste-engine.service";
import type {
  AnalyticsData,
  AnalyticsKpi,
  MonthComparisonRow,
  RankedItem,
} from "@/lib/data/analytics";

const WATCHLIST_COLORS: Record<WatchlistStatus, string> = {
  COMPLETED: "#00ff8c",
  WATCHING: "#ff00cc",
  PENDING: "#2563eb",
  DROPPED: "#ae00ff",
};

const CONTENT_TYPE_LABELS: Record<MediaType, string> = {
  ANIME: "Anime",
  SHOW: "Shows",
  MOVIE: "Movies",
  DOCUMENTARY: "Documentary",
  KDRAMA: "K-Drama",
  SONG: "Song",
  ALBUM: "Album",
  ARTIST: "Artist",
  PLAYLIST: "Playlist",
};

const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Weekday (Mon = 0) and hour in the user's own time zone — not the server's. */
function localClock(date: Date, timezone?: string) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "2-digit", hourCycle: "h23" })
        .formatToParts(date)
        .map((part) => [part.type, part.value]),
    );
    return { weekday: WEEKDAY_INDEX[parts.weekday as string] ?? 0, hour: Number(parts.hour) % 24 };
  } catch {
    return { weekday: date.getDay() === 0 ? 6 : date.getDay() - 1, hour: date.getHours() };
  }
}

/** Weekly rhythm and peak hours look at the last 12 weeks. */
const RHYTHM_WEEKS = 12;

const PEAK_SLOTS = [
  { label: "6-9 AM", start: 6, end: 9 },
  { label: "9-12 PM", start: 9, end: 12 },
  { label: "12-3 PM", start: 12, end: 15 },
  { label: "3-6 PM", start: 15, end: 18 },
  { label: "6-9 PM", start: 18, end: 21 },
  { label: "9-12 AM", start: 21, end: 24 },
  { label: "12-3 AM", start: 0, end: 3 },
] as const;

interface MonthWindow {
  key: string;
  start: Date;
  end: Date;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function last12Months(now = new Date()): MonthWindow[] {
  return Array.from({ length: 12 }, (_, index) => {
    const offset = 11 - index;
    const start = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - offset, 1),
    );
    const end = endOfMonth(start);
    return {
      key: start.toLocaleDateString("en-US", { month: "short" }),
      start,
      end: end > now ? now : end,
    };
  });
}

function inRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  if (hours >= 100) return `${Math.round(hours)} h`;
  if (hours >= 10) return `${hours.toFixed(0)} h`;
  return `${hours.toFixed(1)} h`;
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

function formatDelta(
  current: number,
  previous: number,
  options?: { unit?: string; steadyLabel?: string; invert?: boolean },
): { delta?: string; deltaUp?: boolean } {
  const unit = options?.unit ?? "";
  if (options?.steadyLabel && Math.abs(current - previous) < 0.05) {
    return { delta: options.steadyLabel, deltaUp: true };
  }
  if (previous === 0 && current === 0) {
    return { delta: "no activity yet", deltaUp: true };
  }
  if (previous === 0) {
    return {
      delta: `+${formatCount(Math.round(current))}${unit} this month`,
      deltaUp: true,
    };
  }
  const change = current - previous;
  const pct = (change / previous) * 100;
  const deltaUp = options?.invert ? change <= 0 : change >= 0;
  if (Math.abs(pct) < 1 && Math.abs(change) < 1) {
    return { delta: options?.steadyLabel ?? "steady", deltaUp: true };
  }
  if (Math.abs(pct) >= 1) {
    return {
      delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% vs last month`,
      deltaUp,
    };
  }
  return {
    delta: `${change >= 0 ? "+" : ""}${Math.round(change)}${unit} vs last month`,
    deltaUp,
  };
}

function computeStreak(dates: Date[], now = new Date()): number {
  if (dates.length === 0) return 0;

  const dayKeys = new Set(
    dates.map(
      (date) =>
        `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    ),
  );

  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  if (!dayKeys.has(todayKey) && !dayKeys.has(yesterdayKey)) return 0;
  if (!dayKeys.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!dayKeys.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function bucketRating(score: number): string {
  if (score <= 5) return "≤5";
  if (score >= 10) return "10";
  return String(Math.round(score));
}

function asTasteBreakdown(value: unknown): { axis: string; value: number }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { label: string; value: number } =>
        Boolean(item) &&
        typeof item === "object" &&
        "label" in item &&
        "value" in item &&
        typeof (item as { label: unknown }).label === "string" &&
        typeof (item as { value: unknown }).value === "number",
    )
    .map((item) => ({ axis: item.label, value: item.value }));
}

function buildMilestones(input: {
  completedTitles: number;
  streak: number;
  listenMinutes: number;
  watchMinutes: number;
  roadmapStepsDone: number;
}): AnalyticsData["milestones"] {
  const milestones: AnalyticsData["milestones"] = [];

  if (input.completedTitles >= 100) {
    milestones.push({
      id: "completed-100",
      emoji: "🏆",
      title: "100+ Titles Completed",
      detail: `Crossed ${input.completedTitles} completed titles`,
    });
  } else if (input.completedTitles >= 10) {
    milestones.push({
      id: "completed-10",
      emoji: "📺",
      title: `${input.completedTitles} Titles Completed`,
      detail: "Keep building your watch history",
    });
  }

  if (input.streak >= 7) {
    milestones.push({
      id: "streak",
      emoji: "🔥",
      title: `${input.streak}-Day Streak`,
      detail:
        input.streak >= 14 ? "Your longest streak yet" : "Consistency pays off",
    });
  }

  if (input.listenMinutes >= 200 * 60) {
    milestones.push({
      id: "listen-200",
      emoji: "🎧",
      title: "200h Listening Club",
      detail: `${formatHours(input.listenMinutes)} of music logged`,
    });
  }

  if (input.watchMinutes >= 100 * 60) {
    milestones.push({
      id: "watch-100",
      emoji: "🎬",
      title: "100h Watch Club",
      detail: `${formatHours(input.watchMinutes)} watched on EntertainVerse`,
    });
  }

  if (input.roadmapStepsDone > 0) {
    milestones.push({
      id: "roadmap",
      emoji: "🗺️",
      title: `${input.roadmapStepsDone} Roadmap Step${input.roadmapStepsDone === 1 ? "" : "s"} Done`,
      detail: "Following your AI roadmap",
    });
  }

  if (milestones.length === 0) {
    milestones.push({
      id: "starter",
      emoji: "✨",
      title: "Analytics Unlocked",
      detail: "Your activity will shape these milestones",
    });
  }

  return milestones.slice(0, 4);
}

export async function getAnalyticsForUser(
  userId: string,
): Promise<AnalyticsData> {
  const now = new Date();
  const months = last12Months(now);
  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];

  const yearStart = months[0].start;

  const [
    tasteProfile,
    watchEvents,
    listenEvents,
    watchlistItems,
    reviews,
    ratings,
    posts,
    chatMessages,
    screenTime,
    roadmapStepsDone,
  ] = await Promise.all([
    prisma.tasteProfile.findUnique({ where: { userId } }),
    prisma.watchEvent.findMany({
      where: { userId, watchedAt: { gte: yearStart } },
      include: {
        content: {
          include: { genres: { include: { genre: true } } },
        },
      },
    }),
    prisma.listenEvent.findMany({
      where: { userId, listenedAt: { gte: yearStart } },
      include: { track: true },
    }),
    prisma.watchlistItem.findMany({
      where: { userId },
      include: { content: true },
    }),
    prisma.review.findMany({
      where: { authorId: userId },
      select: { rating: true, createdAt: true },
    }),
    prisma.rating.findMany({
      where: { userId },
      select: { score: true, createdAt: true },
    }),
    prisma.communityPost.findMany({
      where: { authorId: userId },
      select: { likeCount: true, createdAt: true },
    }),
    prisma.communityChatMessage.findMany({
      where: { authorId: userId },
      select: { createdAt: true },
    }),
    prisma.screenTimeSettings.findUnique({ where: { userId }, select: { timezone: true } }),
    prisma.aiRoadmapStep.count({ where: { status: "DONE", roadmap: { userId } } }),
  ]);
  const timezone = screenTime?.timezone;

  const totalWatchMinutes = watchEvents.reduce(
    (sum, event) => sum + event.minutes,
    0,
  );
  const totalListenMinutes = listenEvents.reduce(
    (sum, event) => sum + event.minutes,
    0,
  );

  const currentWatchMinutes = watchEvents
    .filter((event) => inRange(event.watchedAt, currentMonth.start, currentMonth.end))
    .reduce((sum, event) => sum + event.minutes, 0);
  const previousWatchMinutes = watchEvents
    .filter((event) =>
      inRange(event.watchedAt, previousMonth.start, previousMonth.end),
    )
    .reduce((sum, event) => sum + event.minutes, 0);

  const currentListenMinutes = listenEvents
    .filter((event) =>
      inRange(event.listenedAt, currentMonth.start, currentMonth.end),
    )
    .reduce((sum, event) => sum + event.minutes, 0);
  const previousListenMinutes = listenEvents
    .filter((event) =>
      inRange(event.listenedAt, previousMonth.start, previousMonth.end),
    )
    .reduce((sum, event) => sum + event.minutes, 0);

  const completedTitles = watchlistItems.filter(
    (item) => item.status === "COMPLETED",
  ).length;

  const currentEpisodes = watchEvents.filter((event) =>
    inRange(event.watchedAt, currentMonth.start, currentMonth.end),
  ).length;
  const previousEpisodes = watchEvents.filter((event) =>
    inRange(event.watchedAt, previousMonth.start, previousMonth.end),
  ).length;

  const songsPlayed = listenEvents.length;
  const currentSongs = listenEvents.filter((event) =>
    inRange(event.listenedAt, currentMonth.start, currentMonth.end),
  ).length;
  const previousSongs = listenEvents.filter((event) =>
    inRange(event.listenedAt, previousMonth.start, previousMonth.end),
  ).length;

  const allScores = [
    ...reviews.map((row) => row.rating),
    ...ratings.map((row) => row.score),
  ];
  const avgRating =
    allScores.length > 0
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
      : 0;

  // Taste fit: how close each month's watching sits to the user's taste centroid in
  // embedding space, scaled against the whole catalog (0% = least like you, 100% = most).
  const [signals, catalog, index] = await Promise.all([loadTasteSignals(userId), loadTasteCatalog(), loadEmbeddingIndex()]);
  const centroid: Vector | null = index.size ? (await tasteCentroids(signals)).content : null;
  const catalogFits = centroid
    ? catalog.content.flatMap((row) => {
        const vector = index.vectors.get(embeddingKey("content", row.id));
        return vector ? [dot(vector, centroid)] : [];
      })
    : [];
  const fitMin = catalogFits.length ? Math.min(...catalogFits) : 0;
  const fitSpan = (catalogFits.length ? Math.max(...catalogFits) : 1) - fitMin || 1;
  const monthFit = (start: Date, end: Date): number | null => {
    if (!centroid) return null;
    let weighted = 0;
    let minutes = 0;
    for (const event of watchEvents) {
      if (!inRange(event.watchedAt, start, end)) continue;
      const vector = index.vectors.get(embeddingKey("content", event.contentId));
      if (!vector) continue;
      weighted += dot(vector, centroid) * event.minutes;
      minutes += event.minutes;
    }
    return minutes ? Math.round(((weighted / minutes - fitMin) / fitSpan) * 100) : null;
  };
  const currentFit = monthFit(currentMonth.start, currentMonth.end);
  const previousFit = monthFit(previousMonth.start, previousMonth.end);

  const activityDates = [
    ...watchEvents.map((event) => event.watchedAt),
    ...listenEvents.map((event) => event.listenedAt),
  ];
  const streak = computeStreak(activityDates, now);

  const totalReviews = reviews.length;
  const currentReviews = reviews.filter((row) =>
    inRange(row.createdAt, currentMonth.start, currentMonth.end),
  ).length;
  const previousReviews = reviews.filter((row) =>
    inRange(row.createdAt, previousMonth.start, previousMonth.end),
  ).length;

  const kpis: AnalyticsKpi[] = [
    {
      id: "watch-time",
      emoji: "🎬",
      label: "Total Watch Time",
      value: formatHours(totalWatchMinutes),
      ...formatDelta(currentWatchMinutes / 60, previousWatchMinutes / 60, {
        unit: " h",
      }),
    },
    {
      id: "listen-time",
      emoji: "🎧",
      label: "Music Listened",
      value: formatHours(totalListenMinutes),
      ...formatDelta(currentListenMinutes / 60, previousListenMinutes / 60, {
        unit: " h",
      }),
    },
    {
      id: "episodes",
      emoji: "📺",
      label: "Watch Sessions",
      value: formatCount(watchEvents.length),
      ...formatDelta(currentEpisodes, previousEpisodes, { unit: " sessions" }),
    },
    {
      id: "songs",
      emoji: "🎵",
      label: "Songs Played",
      value: formatCount(songsPlayed),
      ...formatDelta(currentSongs, previousSongs, { unit: " plays" }),
    },
    {
      id: "avg-rating",
      emoji: "⭐",
      label: "Avg Rating Given",
      value: allScores.length > 0 ? avgRating.toFixed(1) : "—",
      ...formatDelta(avgRating, avgRating, { steadyLabel: "steady" }),
    },
    {
      id: "taste-fit",
      emoji: "🎯",
      label: "Taste Fit (this month)",
      value: currentFit !== null ? `${currentFit}%` : "—",
      ...(currentFit !== null && previousFit !== null
        ? formatDelta(currentFit, previousFit, { unit: " pts" })
        : { delta: currentFit !== null ? "first month" : "watch something", deltaUp: currentFit !== null }),
    },
    {
      id: "streak",
      emoji: "🔥",
      label: "Day Streak",
      value: formatCount(streak),
      delta: streak > 0 ? "active streak" : "start today",
      deltaUp: streak > 0,
    },
    {
      id: "reviews",
      emoji: "✍️",
      label: "Reviews Written",
      value: formatCount(totalReviews),
      ...formatDelta(currentReviews, previousReviews, {
        unit: " reviews",
        invert: false,
      }),
    },
  ];

  const timeTrend = months.map((month) => ({
    month: month.key,
    watching: Number(
      (
        watchEvents
          .filter((event) => inRange(event.watchedAt, month.start, month.end))
          .reduce((sum, event) => sum + event.minutes, 0) / 60
      ).toFixed(1),
    ),
    listening: Number(
      (
        listenEvents
          .filter((event) => inRange(event.listenedAt, month.start, month.end))
          .reduce((sum, event) => sum + event.minutes, 0) / 60
      ).toFixed(1),
    ),
  }));

  const watchlistStatusMap = watchlistItems.reduce<Record<string, number>>(
    (acc, item) => {
      const label =
        item.status.charAt(0) + item.status.slice(1).toLowerCase();
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const watchlistStatus = Object.entries(watchlistStatusMap).map(
    ([name, value]) => ({
      name,
      value,
      color:
        WATCHLIST_COLORS[
          name.toUpperCase() as WatchlistStatus
        ] ?? "#ff00cc",
    }),
  );

  const genreMinutes = new Map<string, number>();
  for (const event of watchEvents) {
    const genres = event.content.genres.map((row) => row.genre.label);
    const labels =
      genres.length > 0 ? genres : [event.content.type.toLowerCase()];
    const share = event.minutes / labels.length;
    for (const label of labels) {
      const pretty =
        label.charAt(0).toUpperCase() + label.slice(1).replace(/-/g, " ");
      genreMinutes.set(pretty, (genreMinutes.get(pretty) ?? 0) + share);
    }
  }

  const genreDistribution = [...genreMinutes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, minutes]) => ({
      name,
      value: Number((minutes / 60).toFixed(1)),
    }));

  // Live taste traits from the recommender (embeddings); the old onboarding breakdown only as a fallback.
  const insights = await getAiProfileInsights(userId).catch(() => null);
  const liveTraits = (insights?.watchTraits ?? []).slice(0, 6).map((trait) => ({ axis: trait.label, value: trait.score }));
  const tasteProfileData = liveTraits.length >= 3 ? liveTraits : asTasteBreakdown(tasteProfile?.tasteBreakdown);
  const tasteProfileChart =
    tasteProfileData.length > 0
      ? tasteProfileData
      : genreDistribution.slice(0, 6).map((entry) => ({
          axis: entry.name,
          value: Math.min(
            100,
            Math.round((entry.value / Math.max(totalWatchMinutes / 60, 1)) * 100),
          ),
        }));

  const rhythmStart = new Date(now.getTime() - RHYTHM_WEEKS * 7 * 86_400_000);
  const recentWatch = watchEvents.filter((event) => event.watchedAt >= rhythmStart);
  const recentListen = listenEvents.filter((event) => event.listenedAt >= rhythmStart);
  const weeklyWatch = Array.from({ length: 7 }, () => 0);
  const weeklyListen = Array.from({ length: 7 }, () => 0);
  for (const event of recentWatch) weeklyWatch[localClock(event.watchedAt, timezone).weekday]! += event.minutes;
  for (const event of recentListen) weeklyListen[localClock(event.listenedAt, timezone).weekday]! += event.minutes;

  // Average hours on each weekday across the last 12 weeks.
  const weeklyActivity = WEEKDAY_ORDER.map((day, index) => ({
    day,
    watching: Number((weeklyWatch[index]! / 60 / RHYTHM_WEEKS).toFixed(2)),
    listening: Number((weeklyListen[index]! / 60 / RHYTHM_WEEKS).toFixed(2)),
  }));

  const peakHours = PEAK_SLOTS.map((slot) => {
    const minutesInSlot = (date: Date, minutes: number) => {
      const hour = localClock(date, timezone).hour;
      const inSlot =
        slot.start < slot.end
          ? hour >= slot.start && hour < slot.end
          : hour >= slot.start || hour < slot.end;
      return inSlot ? minutes : 0;
    };

    const totalMinutes =
      recentWatch.reduce((sum, event) => sum + minutesInSlot(event.watchedAt, event.minutes), 0) +
      recentListen.reduce((sum, event) => sum + minutesInSlot(event.listenedAt, event.minutes), 0);

    // Hours per week in this slot, averaged over the last 12 weeks.
    return {
      slot: slot.label,
      hours: Number((totalMinutes / 60 / RHYTHM_WEEKS).toFixed(2)),
    };
  });

  const tasteFit = months.map((month) => ({ month: month.key, fit: monthFit(month.start, month.end) }));

  const ratingBuckets = new Map<string, number>();
  for (const score of allScores) {
    const bucket = bucketRating(score);
    ratingBuckets.set(bucket, (ratingBuckets.get(bucket) ?? 0) + 1);
  }
  const ratingsGiven = ["≤5", "6", "7", "8", "9", "10"].map((rating) => ({
    rating,
    titles: ratingBuckets.get(rating) ?? 0,
  }));

  const communityMonths = months.slice(-6);
  const communityEngagement = communityMonths.map((month) => {
    const monthPosts = posts.filter((post) =>
      inRange(post.createdAt, month.start, month.end),
    );
    const monthChats = chatMessages.filter((message) =>
      inRange(message.createdAt, month.start, month.end),
    );
    return {
      month: month.key,
      posts: monthPosts.length,
      likes: monthPosts.reduce((sum, post) => sum + post.likeCount, 0),
      chats: monthChats.length,
    };
  });

  const contentTypeMinutes = new Map<string, number>();
  for (const event of watchEvents) {
    const label = CONTENT_TYPE_LABELS[event.content.type] ?? "Other";
    contentTypeMinutes.set(
      label,
      (contentTypeMinutes.get(label) ?? 0) + event.minutes,
    );
  }
  const contentTypes = [...contentTypeMinutes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, minutes]) => ({
      name,
      value: Number((minutes / 60).toFixed(1)),
    }));

  const titleMinutes = new Map<
    string,
    { title: string; subtitle: string; minutes: number }
  >();
  for (const event of watchEvents) {
    const existing = titleMinutes.get(event.contentId);
    if (existing) {
      existing.minutes += event.minutes;
    } else {
      titleMinutes.set(event.contentId, {
        title: event.content.title,
        subtitle: `${CONTENT_TYPE_LABELS[event.content.type]} · ${event.content.slug}`,
        minutes: event.minutes,
      });
    }
  }

  const topTitleRows = [...titleMinutes.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
  const maxTitleMinutes = topTitleRows[0]?.minutes ?? 1;
  const topTitles: RankedItem[] = topTitleRows.map((row, index) => ({
    id: `title-${index}`,
    title: row.title,
    subtitle: row.subtitle,
    percent: Math.round((row.minutes / maxTitleMinutes) * 100),
    valueLabel: formatHours(row.minutes),
  }));

  const artistMinutes = new Map<string, { plays: number; minutes: number }>();
  for (const event of listenEvents) {
    const artist = event.track.artist;
    const existing = artistMinutes.get(artist) ?? { plays: 0, minutes: 0 };
    existing.plays += 1;
    existing.minutes += event.minutes;
    artistMinutes.set(artist, existing);
  }

  const topArtistRows = [...artistMinutes.entries()]
    .sort((a, b) => b[1].minutes - a[1].minutes)
    .slice(0, 5);
  const maxArtistMinutes = topArtistRows[0]?.[1].minutes ?? 1;
  const topArtists: RankedItem[] = topArtistRows.map(([artist, stats], index) => ({
    id: `artist-${index}`,
    title: artist,
    subtitle: `${stats.plays.toLocaleString("en-US")} plays`,
    percent: Math.round((stats.minutes / maxArtistMinutes) * 100),
    valueLabel: formatHours(stats.minutes),
  }));

  const currentPosts = posts.filter((post) =>
    inRange(post.createdAt, currentMonth.start, currentMonth.end),
  ).length;
  const previousPosts = posts.filter((post) =>
    inRange(post.createdAt, previousMonth.start, previousMonth.end),
  ).length;

  const currentSaves = watchlistItems.filter((item) =>
    inRange(item.addedAt, currentMonth.start, currentMonth.end),
  ).length;
  const previousSaves = watchlistItems.filter((item) =>
    inRange(item.addedAt, previousMonth.start, previousMonth.end),
  ).length;

  const monthComparison: MonthComparisonRow[] = [
    {
      id: "watch",
      label: "Watch Hours",
      current: Number((currentWatchMinutes / 60).toFixed(1)),
      previous: Number((previousWatchMinutes / 60).toFixed(1)),
      unit: "h",
    },
    {
      id: "listen",
      label: "Listening Hours",
      current: Number((currentListenMinutes / 60).toFixed(1)),
      previous: Number((previousListenMinutes / 60).toFixed(1)),
      unit: "h",
    },
    {
      id: "episodes",
      label: "Watch Sessions",
      current: currentEpisodes,
      previous: previousEpisodes,
    },
    {
      id: "posts",
      label: "Community Posts",
      current: currentPosts,
      previous: previousPosts,
    },
    {
      id: "reviews",
      label: "Reviews Written",
      current: currentReviews,
      previous: previousReviews,
    },
    {
      id: "saves",
      label: "Watchlist Saves",
      current: currentSaves,
      previous: previousSaves,
    },
  ];

  const milestones = buildMilestones({
    completedTitles,
    streak,
    listenMinutes: totalListenMinutes,
    watchMinutes: totalWatchMinutes,
    roadmapStepsDone,
  });

  return {
    kpis,
    timeTrend,
    watchlistStatus,
    genreDistribution,
    tasteProfile: tasteProfileChart,
    weeklyActivity,
    peakHours,
    tasteFit,
    ratingsGiven,
    communityEngagement,
    contentTypes,
    topTitles,
    topArtists,
    monthComparison,
    milestones,
    summary: {
      generatedAt: now.toISOString(),
      watchlistTotal: watchlistItems.length,
      currentMonthLabel: currentMonth.key,
      previousMonthLabel: previousMonth.key,
    },
  };
}
