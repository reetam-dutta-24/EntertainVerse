import {
  ChartPanel,
  RankingList,
} from "@/components/analytics";
import {
  AniBarChart,
  AniPieChart,
} from "@/components/charts";
import type { AnalyticsData } from "@/lib/data/analytics";
import { chartPalette } from "@/components/charts/chart-theme";

export interface ProfileAnalyticsSectionProps {
  userName: string;
  data: AnalyticsData;
}

/** Profile stats grid — reuses analytics dashboard chart components. */
export function ProfileAnalyticsSection({
  userName,
  data,
}: ProfileAnalyticsSectionProps) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg font-bold text-white sm:text-heading">
          📊 {userName}&apos;s Taste Analytics
        </h2>
        <p className="mt-1 text-sm text-white/75">
          Genre mix, weekly rhythm, and top picks from real watch and listen history.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="🎭 Genre Distribution"
          subtitle="Hours watched per genre this year"
        >
          <AniPieChart data={data.genreDistribution} height={280} />
        </ChartPanel>

        <ChartPanel
          title="🎬 Content Type Split"
          subtitle="Share of watch time by format"
        >
          <AniPieChart data={data.contentTypes} innerRadius={60} height={280} />
        </ChartPanel>

        <ChartPanel
          title="📅 Weekly Activity"
          subtitle="Average daily hours by weekday"
          className="lg:col-span-2"
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
          title="🏆 Most Watched Content"
          subtitle="Top titles by hours watched"
        >
          <RankingList items={data.topTitles} />
        </ChartPanel>

        <ChartPanel
          title="🎤 Most Played Artists"
          subtitle="Top artists by listening hours"
        >
          <RankingList items={data.topArtists} />
        </ChartPanel>
      </div>
    </section>
  );
}
