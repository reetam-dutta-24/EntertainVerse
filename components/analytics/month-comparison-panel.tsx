import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonthComparisonRow } from "@/lib/data/analytics";

export interface MonthComparisonPanelProps {
  rows: MonthComparisonRow[];
}

function formatValue(value: number, unit?: string) {
  return `${value}${unit ?? ""}`;
}

/** This month vs last month — compact delta rows. */
export function MonthComparisonPanel({ rows }: MonthComparisonPanelProps) {
  return (
    <ul className="flex flex-col divide-y divide-white/8">
      {rows.map((row) => {
        const up = row.current >= row.previous;
        const change =
          row.previous === 0
            ? 100
            : Math.round(((row.current - row.previous) / row.previous) * 100);
        return (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <span className="min-w-0 truncate text-sm text-white/85">
              {row.label}
            </span>
            <span className="flex shrink-0 items-center gap-2.5">
              <span className="text-xs text-muted">
                {formatValue(row.previous, row.unit)} →
              </span>
              <span className="text-sm font-bold text-white">
                {formatValue(row.current, row.unit)}
              </span>
              <span
                className={cn(
                  "flex w-[52px] items-center justify-end gap-0.5 text-xs font-semibold",
                  up ? "text-online" : "text-brand-pink",
                )}
              >
                {up ? (
                  <ArrowUpRight className="size-3.5 shrink-0" />
                ) : (
                  <ArrowDownRight className="size-3.5 shrink-0" />
                )}
                {Math.abs(change)}%
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
