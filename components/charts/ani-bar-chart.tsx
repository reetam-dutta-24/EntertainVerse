"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartAxis,
  chartColors,
  chartGrid,
  chartTooltipStyle,
} from "./chart-theme";
import { ChartEmpty, isChartDataEmpty } from "./chart-empty";

export interface AniBarChartSeries {
  key: string;
  label?: string;
  color?: string;
}

export interface AniBarChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  series: AniBarChartSeries[];
  height?: number;
  /** Cycle bar colors per category (single-series categorical charts). */
  colorByCategory?: boolean;
  /** Hide the legend for single-series charts. */
  showLegend?: boolean;
  className?: string;
}

/** Dark neon-themed bar chart matching the EntertainVerse analytics style. */
export function AniBarChart({
  data,
  xKey,
  series,
  height = 320,
  colorByCategory = false,
  showLegend = true,
  className,
}: AniBarChartProps) {
  if (isChartDataEmpty(data as unknown as Record<string, unknown>[])) return <ChartEmpty />;

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={chartGrid} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke={chartAxis}
            tick={{ fill: chartAxis, fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            stroke={chartAxis}
            tick={{ fill: chartAxis, fontSize: 12 }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            cursor={{ fill: "rgba(255, 0, 204, 0.08)" }}
          />
          {showLegend ? <Legend wrapperStyle={{ color: chartAxis }} /> : null}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label ?? s.key}
              fill={s.color ?? chartColors[i % chartColors.length]}
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
            >
              {colorByCategory
                ? data.map((_, cellIndex) => (
                    <Cell
                      key={cellIndex}
                      fill={chartColors[cellIndex % chartColors.length]}
                    />
                  ))
                : null}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
