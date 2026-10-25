"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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

export interface AniAreaChartSeries {
  key: string;
  label?: string;
  color?: string;
}

export interface AniAreaChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  series: AniAreaChartSeries[];
  height?: number;
  yDomain?: [number, number];
  className?: string;
}

/** Dark neon-themed gradient area chart matching the EntertainVerse analytics style. */
export function AniAreaChart({
  data,
  xKey,
  series,
  height = 320,
  yDomain,
  className,
}: AniAreaChartProps) {
  if (isChartDataEmpty(data as unknown as Record<string, unknown>[])) return <ChartEmpty />;

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            {series.map((s, i) => {
              const color = s.color ?? chartColors[i % chartColors.length];
              return (
                <linearGradient
                  key={s.key}
                  id={`ani-area-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
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
            domain={yDomain}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            cursor={{ stroke: chartAxis, strokeDasharray: "4 4" }}
          />
          <Legend wrapperStyle={{ color: chartAxis }} />
          {series.map((s, i) => {
            const color = s.color ?? chartColors[i % chartColors.length];
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label ?? s.key}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#ani-area-${s.key})`}
                activeDot={{ r: 5 }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
