import type { Metadata } from "next";
import Link from "next/link";
import {
  AnalyticsKpiGrid,
  ChartPanel,
  MilestonesStrip,
  MonthComparisonPanel,
  RankingList,
} from "@/components/analytics";
import {
  AniAreaChart,
  AniBarChart,
  AniLineChart,
  AniPieChart,
  AniRadarChart,
} from "@/components/charts";
import { WelcomeBanner } from "@/components/dashboard";
import { AnalyticsLiveRefresh } from "@/components/analytics/analytics-live-refresh";
import { TasteDnaHistoryPanel } from "@/components/analytics/taste-dna-history";
import { getAnalyticsData } from "@/lib/data/analytics";
import { getCurrentUser } from "@/lib/data/user";
import { getTasteDnaHistory } from "@/lib/services/wrapped.service";
import { chartPalette } from "@/components/charts/chart-theme";

export const metadata: Metadata = {
  title: "Analytics — AniVerse",
  description:
    "Track your watching, listening, genres, community activity, and taste patterns.",
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const [data, dna] = await Promise.all([getAnalyticsData(user.id), getTasteDnaHistory(user.id)]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <WelcomeBanner userName={user.name} variant="analytics" />
      <AnalyticsLiveRefresh generatedAt={data.summary.generatedAt} />

      <Link
        href="/dashboard/wrapped"
        className="group flex flex-col gap-3 rounded-card border border-brand-magenta/40 bg-gradient-to-r from-brand-purple/40 via-brand-magenta/20 to-transparent p-4 transition-colors hover:border-brand-magenta/70 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <span>
          <span className="block text-base font-bold text-white sm:text-lg">🎁 Your AniVerse Wrapped {new Date().getFullYear()} is ready</span>
          <span className="mt-0.5 block text-xs text-muted sm:text-sm">Top titles, songs, Taste DNA eras and the persona AI named you.</span>
        </span>
        <span className="inline-flex w-full items-center justify-center rounded-full bg-gradient-brand px-5 py-2 text-sm font-semibold text-white sm:w-auto">
          Play my Wrapped
        </span>
      </Link>

      {/* 1 — Headline KPIs */}
      <AnalyticsKpiGrid kpis={data.kpis} />

      {/* 2 — Milestones */}
      <MilestonesStrip milestones={data.milestones} />

      {/* 3 + 4 — Watch/listen trend + watchlist progress */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartPanel
          title="📈 Watch & listen hours"
          subtitle="Monthly hours across the last 12 months"
          className="lg:col-span-2"
        >
          <AniAreaChart
            data={data.timeTrend}
            xKey="month"
            series={[
              { key: "watching", label: "Watching (h)", color: chartPalette.magenta },
              { key: "listening", label: "Listening (h)", color: chartPalette.teal },
            ]}
            height={300}
          />
        </ChartPanel>
        <ChartPanel
          title="📋 Watchlist progress"
          subtitle={`Where your ${data.summary.watchlistTotal} saved titles stand`}
        >
          <AniPieChart data={data.watchlistStatus} innerRadius={60} height={300} />
        </ChartPanel>
      </div>

      {/* 5 + 6 — Genre split + taste radar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="🎭 Genre distribution"
          subtitle="Hours watched per genre this year"
        >
          <AniPieChart data={data.genreDistribution} height={300} />
        </ChartPanel>
        <ChartPanel
          title="🧠 Your taste reads as"
          subtitle="Live from the recommender — how strongly each vibe fits what you love"
        >
          <AniRadarChart data={data.tasteProfile} name="Taste Score" height={300} />
        </ChartPanel>
      </div>

      {/* Taste DNA history */}
      <ChartPanel
        title="🧬 Taste DNA history"
        subtitle="Your strongest traits month by month, read from what you watched and favorited (embeddings) — and the eras they formed"
      >
        <TasteDnaHistoryPanel dna={dna} />
      </ChartPanel>

      {/* 7 + 8 — Weekly rhythm + peak hours */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="📅 Weekly activity"
          subtitle="Average hours per weekday · last 12 weeks, your time zone"
        >
          <AniBarChart
            data={data.weeklyActivity}
            xKey="day"
            series={[
              { key: "watching", label: "Watching (h)", color: chartPalette.magenta },
              { key: "listening", label: "Listening (h)", color: chartPalette.blue },
            ]}
            height={280}
          />
        </ChartPanel>
        <ChartPanel
          title="⏰ Peak activity hours"
          subtitle="Hours per week in each slot · last 12 weeks, your time zone"
        >
          <AniBarChart
            data={data.peakHours}
            xKey="slot"
            series={[{ key: "hours", label: "Hours" }]}
            colorByCategory
            showLegend={false}
            height={280}
          />
        </ChartPanel>
      </div>

      {/* 9 + 10 — AI accuracy trend + month comparison */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartPanel
          title="🎯 Taste fit"
          subtitle="How close each month's watching was to your taste (embeddings) — higher means you watched more of what you love"
          className="lg:col-span-2"
        >
          <AniLineChart
            data={data.tasteFit}
            xKey="month"
            series={[{ key: "fit", label: "Taste fit %", color: chartPalette.green }]}
            height={280}
          />
        </ChartPanel>
        <ChartPanel
          title="🗓️ This month vs last"
          subtitle={`${data.summary.currentMonthLabel} compared with ${data.summary.previousMonthLabel}`}
        >
          <MonthComparisonPanel rows={data.monthComparison} />
        </ChartPanel>
      </div>

      {/* 11 + 12 — Ratings given + content type split */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="⭐ Ratings you give"
          subtitle="How many titles received each score"
        >
          <AniBarChart
            data={data.ratingsGiven}
            xKey="rating"
            series={[{ key: "titles", label: "Titles" }]}
            colorByCategory
            showLegend={false}
            height={280}
          />
        </ChartPanel>
        <ChartPanel
          title="🎬 Content type split"
          subtitle="Share of watch time by format"
        >
          <AniPieChart data={data.contentTypes} innerRadius={60} height={280} />
        </ChartPanel>
      </div>

      {/* 13 — Community engagement */}
      <ChartPanel
        title="👥 Community engagement"
        subtitle="Posts, likes, and chat messages per month"
      >
        <AniBarChart
          data={data.communityEngagement}
          xKey="month"
          series={[
            { key: "posts", label: "Posts", color: chartPalette.magenta },
            { key: "likes", label: "Likes", color: chartPalette.purple },
            { key: "chats", label: "Chats", color: chartPalette.teal },
          ]}
          height={300}
        />
      </ChartPanel>

      {/* 14 + 15 — Top titles + top artists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="🏆 Most watched titles"
          subtitle="Your top 5 by hours watched"
        >
          <RankingList items={data.topTitles} />
        </ChartPanel>
        <ChartPanel
          title="🎤 Most played artists"
          subtitle="Your top 5 by listening hours"
        >
          <RankingList items={data.topArtists} />
        </ChartPanel>
      </div>
    </div>
  );
}
