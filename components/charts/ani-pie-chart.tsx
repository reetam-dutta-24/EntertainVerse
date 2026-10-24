"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { chartAxis, chartColors, chartTooltipStyle } from "./chart-theme";
import { ChartEmpty, isChartDataEmpty } from "./chart-empty";

export interface AniPieChartDatum {
  name: string;
  value: number;
  color?: string;
}

export interface AniPieChartProps {
  data: AniPieChartDatum[];
  height?: number;
  /** Renders a donut when set, e.g. 60. */
  innerRadius?: number;
  className?: string;
}

/** Dark neon-themed pie/donut chart (Figma genre PieChart). */
export function AniPieChart({
  data,
  height = 320,
  innerRadius = 0,
  className,
}: AniPieChartProps) {
  if (isChartDataEmpty(data as unknown as Record<string, unknown>[])) return <ChartEmpty />;

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius="80%"
            stroke="var(--color-background)"
            strokeWidth={2}
            label={({ name, percent }) =>
              `${name} ${Math.round((percent ?? 0) * 100)}%`
            }
          >
            {data.map((datum, i) => (
              <Cell
                key={datum.name}
                fill={datum.color ?? chartColors[i % chartColors.length]}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend wrapperStyle={{ color: chartAxis }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
