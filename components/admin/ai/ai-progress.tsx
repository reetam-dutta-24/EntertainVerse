import { LoaderCircle } from "lucide-react";
import type { AiTaskProgress } from "@/hooks/use-ai-task";

/** Step label + percentage bar for the admin AI import / review tasks. */
export function AiProgress({ progress, hint }: { progress: AiTaskProgress; hint?: string }) {
  const percent = Math.round(progress.percent);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex min-w-0 items-center gap-2 text-white/80">
          {percent < 100 ? (
            <LoaderCircle className="size-3.5 shrink-0 animate-spin text-brand-pink" aria-hidden />
          ) : null}
          <span className="truncate">{progress.label}</span>
        </span>
        <span className="shrink-0 tabular-nums text-white/55">
          {percent}% · {progress.elapsedSeconds}s
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={progress.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-brand transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {hint ? <p className="text-micro text-white/40">{hint}</p> : null}
    </div>
  );
}
