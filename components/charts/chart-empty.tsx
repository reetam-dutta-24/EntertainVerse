import { ChartColumn } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/** True when a chart has no rows, or every numeric value is zero. */
export function isChartDataEmpty(data: Record<string, unknown>[]) {
  if (data.length === 0) return true;
  return data.every((row) =>
    Object.values(row).every((value) => typeof value !== "number" || value === 0),
  );
}

/** Shared empty state for analytics + profile charts. */
export function ChartEmpty() {
  return (
    <EmptyState
      compact
      icon={<ChartColumn />}
      description="No data yet — this chart fills in as you watch and listen."
      className="min-h-[200px] justify-center"
    />
  );
}
