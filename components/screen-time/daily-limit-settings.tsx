"use client";

import { useState } from "react";
import { Hourglass, ShieldCheck } from "lucide-react";
import { useConfirm, useToast } from "@/components/feedback/feedback-provider";
import { SettingsSection } from "@/components/settings/settings-section";
import { formatLimit, LIMIT_PRESETS, type ScreenTimeStatus } from "@/lib/screen-time/types";
import { cn } from "@/lib/utils";

const timezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

/** Settings → Daily limit: pick the most time you want to spend here each day. */
export function DailyLimitSettings({ initialStatus }: { initialStatus: ScreenTimeStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const confirmAction = useConfirm();
  const toast = useToast();
  const current = status.limitMinutes;

  async function apply(limit: number | null) {
    if (limit === current && !status.pending) return;
    const lowering = current === null || (limit !== null && limit < current);
    if (lowering && limit !== null) {
      const overNow = status.usedMinutes >= limit;
      const confirmed = await confirmAction({
        title: current === null ? `Limit yourself to ${formatLimit(limit)} a day?` : `Lower your limit to ${formatLimit(limit)}?`,
        description: overNow
          ? `You've already spent ${status.usedMinutes} min here today, so AniVerse locks right away until midnight. This is strict: raising the limit or switching it off only takes effect tomorrow.`
          : "This is strict on purpose: 5 minutes before the limit you get a warning, then AniVerse locks until midnight. Raising the limit or switching it off only takes effect tomorrow.",
        confirmLabel: overNow ? "Lock me out now" : "Turn on",
        destructive: overNow,
      });
      if (!confirmed) return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/screen-time", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyLimitMinutes: limit, timezone: timezone() }),
      });
      const data = (await response.json()) as { status?: ScreenTimeStatus; appliesFrom?: string; error?: string };
      if (!response.ok || !data.status) throw new Error(data.error ?? "Couldn't save your limit.");
      setStatus(data.status);
      if (data.appliesFrom === "tomorrow") toast(limit === null ? "Your limit switches off tomorrow." : `Your new limit of ${formatLimit(limit)} starts tomorrow.`, "info");
      else if (data.appliesFrom === "now") toast(`Daily limit set to ${formatLimit(limit!)}.`, "success");
      if (data.status.locked) window.location.reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't save your limit.", "error");
    } finally {
      setBusy(false);
    }
  }

  const usedPercent = current ? Math.min(100, Math.round((status.usedMinutes / current) * 100)) : 0;

  return (
    <div id="daily-limit" className="scroll-mt-24">
      <SettingsSection
        title="⏳ Daily limit"
        subtitle="Built to help you enjoy more and binge less — most apps are designed to do the opposite"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand">
              <Hourglass className="size-5 text-white" aria-hidden />
            </span>
            <div className="text-sm text-white/70">
              <p>
                Choose the most time you want to spend on AniVerse each day — watching and listening included. Five minutes
                before the end you get a warning; then the app locks until midnight.
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
                <ShieldCheck className="size-3.5" aria-hidden /> Strict: lowering applies now; raising or switching off waits until tomorrow.
              </p>
            </div>
          </div>
          {current ? (
            <div className="w-full shrink-0 rounded-2xl bg-black/25 p-3 lg:w-64">
              <p className="flex justify-between text-xs text-white/60">
                <span>Today</span>
                <span className="tabular-nums">
                  {status.usedMinutes} / {current} min
                </span>
              </p>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-white/10">
                <span
                  className={cn("block h-full rounded-full", usedPercent >= 90 ? "bg-amber-300" : "bg-gradient-brand")}
                  style={{ width: `${usedPercent}%` }}
                />
              </span>
            </div>
          ) : null}
        </div>

        <div role="radiogroup" aria-label="Daily limit" className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          <button
            type="button"
            role="radio"
            aria-checked={current === null}
            disabled={busy}
            onClick={() => void apply(null)}
            className={cn(
              "cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
              current === null ? "border-brand-magenta bg-brand-magenta/15 text-white" : "border-white/10 text-white/70 hover:border-white/25",
            )}
          >
            Off
          </button>
          {LIMIT_PRESETS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              role="radio"
              aria-checked={current === minutes}
              disabled={busy}
              onClick={() => void apply(minutes)}
              className={cn(
                "cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                current === minutes ? "border-brand-magenta bg-brand-magenta/15 text-white" : "border-white/10 text-white/70 hover:border-white/25",
                status.pending?.limitMinutes === minutes && "border-dashed border-amber-300/60",
              )}
            >
              {formatLimit(minutes)}
            </button>
          ))}
        </div>

        {status.pending ? (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/[0.08] px-4 py-2.5 text-xs text-amber-100">
            {status.pending.limitMinutes === null
              ? "Your limit switches off tomorrow."
              : `Your new limit of ${formatLimit(status.pending.limitMinutes)} starts tomorrow.`}{" "}
            Pick your current limit again to cancel.
          </p>
        ) : null}
      </SettingsSection>
    </div>
  );
}
