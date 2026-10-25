"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { AniLineChart } from "@/components/charts";
import { chartColors } from "@/components/charts/chart-theme";
import type { TasteDnaHistory } from "@/lib/wrapped/types";

/** How your taste moved month by month: strands for your strongest traits, plus the eras they formed. */
export function TasteDnaHistoryPanel({ dna }: { dna: TasteDnaHistory }) {
  if (dna.activeMonths === 0) {
    return <p className="text-sm text-white/55">Watch or favorite a few titles and your Taste DNA starts tracking here, month by month.</p>;
  }

  const data = dna.months.map((month) => ({
    month: month.month,
    ...Object.fromEntries(dna.strands.map((trait) => [trait.id, month.scores[trait.id] ?? null])),
  }));

  return (
    <div className="flex flex-col gap-4">
      <AniLineChart
        data={data}
        xKey="month"
        series={dna.strands.map((trait, index) => ({ key: trait.id, label: `${trait.emoji} ${trait.label}`, color: chartColors[index % chartColors.length] }))}
        height={280}
      />

      {dna.rising || dna.fading ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {dna.rising ? (
            <p className="flex flex-1 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-caption text-white/85">
              <TrendingUp className="size-4 shrink-0 text-emerald-300" aria-hidden />
              <span>
                Rising: <strong className="text-white">{dna.rising.trait.emoji} {dna.rising.trait.label}</strong> (+{dna.rising.delta})
              </span>
            </p>
          ) : null}
          {dna.fading ? (
            <p className="flex flex-1 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-caption text-white/75">
              <TrendingDown className="size-4 shrink-0 text-white/50" aria-hidden />
              <span>
                Fading: <strong className="text-white">{dna.fading.trait.emoji} {dna.fading.trait.label}</strong> ({dna.fading.delta})
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {dna.eras.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Your eras</p>
          <ol className="flex gap-2 overflow-x-auto pb-1">
            {dna.eras.map((era, index) => (
              <li key={`${era.label}-${index}`} className="flex shrink-0 flex-col rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                <span className="text-micro uppercase tracking-wide text-white/45">{era.label}</span>
                <span className="text-sm font-semibold text-white">
                  {era.trait.emoji} {era.trait.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
