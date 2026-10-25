"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

export interface AniLineChartSeries {
  /** Key in each data row holding this series' value. */
  key: string;
  label?: string;
  color?: string;
}

export interface AniLineChartProps {
  /** `null` values leave a gap in the line (e.g. a month with no data). */
  data: Record<string, string | number | null>[];
  /** Key in each data row used for the x-axis (e.g. "month"). */
  xKey: string;
  series: AniLineChartSeries[];
  height?: number;
  className?: string;
}

/** Dark neon-themed line chart (Figma analytics line chart). */
export function AniLineChart({
  data,
  xKey,
  series,
  height = 320,
  className,
}: AniLineChartProps) {
  if (isChartDataEmpty(data as unknown as Record<string, unknown>[])) return <ChartEmpty />;

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={chartGrid} strokeDasharray="4 4" />
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
            cursor={{ stroke: chartAxis, strokeDasharray: "4 4" }}
          />
          <Legend wrapperStyle={{ color: chartAxis }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={s.color ?? chartColors[i % chartColors.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
