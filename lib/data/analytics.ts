import { getAnalyticsForUser } from "@/lib/services/analytics.service";

export interface AnalyticsKpi {
  id: string;
  emoji: string;
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
}

export interface RankedItem {
  id: string;
  title: string;
  subtitle?: string;
  percent: number;
  valueLabel: string;
}

export interface MonthComparisonRow {
  id: string;
  label: string;
  current: number;
  previous: number;
  unit?: string;
}

export interface AnalyticsData {
  kpis: AnalyticsKpi[];
  timeTrend: { month: string; watching: number; listening: number }[];
  watchlistStatus: { name: string; value: number; color?: string }[];
  genreDistribution: { name: string; value: number }[];
  tasteProfile: { axis: string; value: number }[];
  weeklyActivity: { day: string; watching: number; listening: number }[];
  peakHours: { slot: string; hours: number }[];
  /** Monthly taste fit 0–100 (null = nothing watched that month). */
  tasteFit: { month: string; fit: number | null }[];
  ratingsGiven: { rating: string; titles: number }[];
  communityEngagement: {
    month: string;
    posts: number;
    likes: number;
    chats: number;
  }[];
  contentTypes: { name: string; value: number }[];
  topTitles: RankedItem[];
  topArtists: RankedItem[];
  monthComparison: MonthComparisonRow[];
  milestones: { id: string; emoji: string; title: string; detail: string }[];
  summary: {
    /** When this snapshot was computed (ISO). */
    generatedAt: string;
    watchlistTotal: number;
    currentMonthLabel: string;
    previousMonthLabel: string;
  };
}

export async function getAnalyticsData(userId: string): Promise<AnalyticsData> {
  return getAnalyticsForUser(userId);
}
