"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { chartAxis, chartGrid, chartTooltipStyle, chartPalette } from "./chart-theme";

export interface AniRadarChartDatum {
  axis: string;
  value: number;
}

export interface AniRadarChartProps {
  data: AniRadarChartDatum[];
  /** Radar series name shown in the tooltip. */
  name?: string;
  color?: string;
  maxValue?: number;
  height?: number;
  className?: string;
}

/** Dark neon-themed radar chart — taste/mood profile visualization. */
export function AniRadarChart({
  data,
  name = "Score",
  color = chartPalette.magenta,
  maxValue = 100,
  height = 320,
  className,
}: AniRadarChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={chartGrid} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: chartAxis, fontSize: 12 }}
          />
          <PolarRadiusAxis
            domain={[0, maxValue]}
            tick={false}
            axisLine={false}
          />
          <Radar
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={2.5}
            fill={color}
            fillOpacity={0.25}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
