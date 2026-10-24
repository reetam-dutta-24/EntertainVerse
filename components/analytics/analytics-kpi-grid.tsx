import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsKpi } from "@/lib/data/analytics";

export interface AnalyticsKpiGridProps {
  kpis: AnalyticsKpi[];
}

/** Headline metric tiles — 2 columns on mobile, 4 on desktop. */
export function AnalyticsKpiGrid({ kpis }: AnalyticsKpiGridProps) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="flex flex-col gap-1 rounded-xl bg-glass-magenta px-3 py-3 shadow-[0_0_14px_2px_rgba(255,0,204,0.4)] transition-shadow duration-300 hover:shadow-[0_0_18px_3px_rgba(255,0,204,0.55)] sm:px-4 sm:py-4"
        >
          <span className="text-caption font-semibold text-white sm:text-xs">
            {kpi.emoji} {kpi.label}
          </span>
          <span className="text-xl font-bold text-white sm:text-2xl">
            {kpi.value}
          </span>
          {kpi.delta ? (
            <span
              className={cn(
                "flex items-center gap-1 text-caption font-medium",
                kpi.deltaUp ? "text-white/90" : "text-white/70",
              )}
            >
              {kpi.deltaUp ? (
                <TrendingUp className="size-3 shrink-0" />
              ) : (
                <TrendingDown className="size-3 shrink-0" />
              )}
              {kpi.delta}
            </span>
          ) : null}
        </div>
      ))}
    </section>
  );
}
