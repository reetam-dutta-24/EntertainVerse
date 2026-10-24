"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  Check,
  CircleDashed,
  Clock,
  Headphones,
  Map as MapIcon,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  TriangleAlert,
  Tv,
  Undo2,
  X,
} from "lucide-react";
import { AiProgress } from "@/components/admin/ai/ai-progress";
import { useConfirm, useToast } from "@/components/feedback/feedback-provider";
import { HdImage } from "@/components/ui/hd-image";
import { useAiTask } from "@/hooks/use-ai-task";
import { formatMinutes, type RoadmapStepView, type RoadmapView } from "@/lib/roadmap/types";
import { cn } from "@/lib/utils";

type Mode = "watch" | "listen";

const ADJUST_CHIPS: Record<Mode, string[]> = {
  watch: ["Make it shorter", "More anime", "Lighter, less dark", "Add a movie night"],
  listen: ["More upbeat", "Only Japanese songs", "Add more artists", "Calmer"],
};

const STATUS_STYLE: Record<RoadmapStepView["status"], { label: string; className: string; icon: typeof Check }> = {
  PENDING: { label: "Up next", className: "border-white/15 text-white/70", icon: CircleDashed },
  IN_PROGRESS: { label: "In progress", className: "border-brand-magenta/50 text-brand-pink", icon: Play },
  DONE: { label: "Done", className: "border-emerald-400/40 text-emerald-200", icon: Check },
  DROPPED: { label: "Dropped", className: "border-white/10 text-white/40", icon: X },
};

export interface RoadmapBoardProps {
  mode: Mode;
  initialRoadmap: RoadmapView | null;
  /** Start building right away (coming from AI-mode results). */
  autoBuild?: boolean;
}

function groupByPhase(steps: RoadmapStepView[]) {
  const groups: { phase: string; steps: RoadmapStepView[] }[] = [];
  for (const step of steps) {
    const last = groups.at(-1);
    if (last && last.phase === step.phase) last.steps.push(step);
    else groups.push({ phase: step.phase, steps: [step] });
  }
  return groups;
}

/** The roadmap page: analysis, time-budgeted timeline, auto-tracked progress, swaps and the adjust-chat. */
export function RoadmapBoard({ mode, initialRoadmap, autoBuild }: RoadmapBoardProps) {
  const [roadmap, setRoadmap] = useState(initialRoadmap);
  const [instruction, setInstruction] = useState("");
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const buildTask = useAiTask<RoadmapView>();
  const confirmAction = useConfirm();
  const toast = useToast();
  const started = useRef(false);
  const unit = mode === "watch" ? "Week" : "Stage";

  async function build(adjust?: string) {
    setError(null);
    try {
      const next = await buildTask.run("/api/ai/roadmaps", { mode, ...(adjust ? { instruction: adjust } : {}) });
      setRoadmap(next);
      setInstruction("");
      if (adjust) toast("Roadmap updated — finished steps were kept.", "success");
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : "Couldn't build the roadmap.");
    }
  }

  useEffect(() => {
    if (autoBuild && !started.current) {
      started.current = true;
      void build();
    }
    // Run once on mount when asked to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function stepAction(step: RoadmapStepView, action: "done" | "undo" | "drop" | "replace") {
    if (!roadmap) return;
    setBusyStep(step.id);
    try {
      const response = await fetch(`/api/ai/roadmaps/${roadmap.id}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { roadmap?: RoadmapView; error?: string };
      if (!response.ok || !data.roadmap) throw new Error(data.error ?? "Couldn't update the step.");
      setRoadmap(data.roadmap);
      if (action === "replace") toast(`Swapped out ${step.title}.`, "success");
    } catch (stepError) {
      toast(stepError instanceof Error ? stepError.message : "Couldn't update the step.", "error");
    } finally {
      setBusyStep(null);
    }
  }

  async function regenerate() {
    const confirmed = await confirmAction({
      title: "Build a fresh roadmap?",
      description: "Steps you've finished or started are kept; the rest of the plan is rebuilt from your current taste.",
      confirmLabel: "Rebuild",
    });
    if (confirmed) void build();
  }

  const building = buildTask.running;
  const modeTabs = (
    <div className="flex gap-1 rounded-full border border-white/10 bg-black/30 p-1">
      {(["watch", "listen"] as const).map((value) => (
        <Link
          key={value}
          href={`/dashboard/ai-mode/roadmap?mode=${value}`}
          aria-current={value === mode ? "page" : undefined}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors sm:flex-none",
            value === mode ? "bg-gradient-brand text-white" : "text-white/60 hover:text-white",
          )}
        >
          {value === "watch" ? <Tv className="size-4" aria-hidden /> : <Headphones className="size-4" aria-hidden />}
          {value === "watch" ? "Watch" : "Listen"}
        </Link>
      ))}
    </div>
  );

  if (!roadmap) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex justify-end">{modeTabs}</div>
        <section className="flex flex-col items-center gap-4 rounded-3xl border border-brand-magenta/25 bg-gradient-to-br from-brand-purple/25 via-surface to-surface px-4 py-10 text-center sm:px-8">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-pink">
            <MapIcon className="size-7 text-white" aria-hidden />
          </span>
          <div className="max-w-lg">
            <h2 className="text-lg font-bold text-white sm:text-xl">Your {mode === "watch" ? "watch" : "listening"} roadmap</h2>
            <p className="mt-1 text-sm text-white/65">
              An ordered plan that fits your week, with a written analysis of your taste. Steps tick off as you {mode === "watch" ? "watch" : "listen"}.
            </p>
          </div>
          {buildTask.progress ? (
            <div className="w-full max-w-md text-left">
              <AiProgress progress={buildTask.progress} hint="The free-tier model usually takes 10–40 seconds." />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void build()}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
            >
              <Sparkles className="size-4" aria-hidden /> Build my roadmap
            </button>
          )}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Link href={`/dashboard/ai-mode?mode=${mode}`} className="text-sm text-white/55 hover:text-white">
            Update your answers first →
          </Link>
        </section>
      </div>
    );
  }

  const live = roadmap.steps.filter((step) => step.status !== "DROPPED");

  return (
    <div className={cn("flex flex-col gap-5 sm:gap-6", building && "pointer-events-none opacity-70")} aria-busy={building}>
      <section className="flex flex-col gap-4 rounded-3xl border border-brand-magenta/25 bg-gradient-to-br from-brand-purple/25 via-surface to-surface p-4 shadow-card-inner sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-pink">
              <MapIcon className="size-3.5" aria-hidden /> Your {mode === "watch" ? "watch" : "listening"} roadmap
            </p>
            <h1 className="mt-1 text-lg font-bold text-white sm:text-2xl">{roadmap.title}</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {modeTabs}
            <button
              type="button"
              onClick={() => void regenerate()}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 sm:w-auto"
            >
              <RotateCcw className="size-4" aria-hidden /> Rebuild
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[
            { label: "Total", value: formatMinutes(roadmap.totalMinutes) },
            {
              label: mode === "watch" ? "Pace" : "Stages",
              value: mode === "watch" ? `${roadmap.weeks} wk · ${roadmap.scheduledHours} h/wk` : String(roadmap.weeks),
            },
            { label: "Steps done", value: `${roadmap.doneSteps} / ${live.length}` },
            { label: "Progress", value: `${roadmap.progressPercent}%` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-black/25 px-3 py-2.5">
              <p className="text-caption text-white/55">{stat.label}</p>
              <p className="text-xl font-bold text-white sm:text-2xl">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={roadmap.progressPercent} aria-label="Roadmap progress">
          <motion.div className="h-full rounded-full bg-gradient-brand" initial={false} animate={{ width: `${roadmap.progressPercent}%` }} />
        </div>
        {mode === "watch" && !roadmap.weeklyHours ? (
          <p className="text-xs text-white/50">
            Scheduled at {roadmap.scheduledHours} h a week —{" "}
            <Link href="/dashboard/ai-mode?mode=watch&start=quiz" className="text-brand-pink hover:underline">
              tell AI mode your real time budget
            </Link>{" "}
            and rebuild.
          </p>
        ) : null}
      </section>

      {buildTask.progress ? <AiProgress progress={buildTask.progress} hint="Updating your plan — finished steps stay." /> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <section className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white sm:text-lg">🧠 What your taste says</h2>
          <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-caption text-white/55">
            {roadmap.aiWritten ? "Written by AI" : "Built by the recommender — AI writer was busy"}
          </span>
        </div>
        {roadmap.analysis.headline ? <p className="text-base font-semibold text-white">{roadmap.analysis.headline}</p> : null}
        {roadmap.analysis.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-relaxed text-white/75">
            {paragraph}
          </p>
        ))}
        {roadmap.analysis.strengths.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {roadmap.analysis.strengths.map((strength) => (
              <li key={strength} className="rounded-full bg-brand-magenta/15 px-3 py-1 text-xs text-brand-pink">
                {strength}
              </li>
            ))}
          </ul>
        ) : null}
        {roadmap.analysis.tips.length ? (
          <ul className="flex flex-col gap-1 border-t border-white/10 pt-3 text-sm text-white/70">
            {roadmap.analysis.tips.map((tip) => (
              <li key={tip}>💡 {tip}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="flex flex-col gap-5" aria-label="Roadmap steps">
        {groupByPhase(roadmap.steps).map((group) => {
          const weeks = group.steps.filter((s) => s.status !== "DROPPED").map((s) => s.week);
          const range = weeks.length ? (Math.min(...weeks) === Math.max(...weeks) ? `${unit} ${weeks[0]}` : `${unit}s ${Math.min(...weeks)}–${Math.max(...weeks)}`) : "";
          return (
            <div key={`${group.phase}-${group.steps[0]!.id}`} className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-white/80">{group.phase}</h3>
                <span className="text-xs text-white/45">{range}</span>
              </div>
              <ol className="flex flex-col gap-2.5">
                {group.steps.map((step) => {
                  const style = STATUS_STYLE[step.status];
                  const busy = busyStep === step.id;
                  const dropped = step.status === "DROPPED";
                  return (
                    <li
                      key={step.id}
                      className={cn(
                        "flex flex-col gap-3 rounded-2xl border bg-surface/70 p-3 transition-colors sm:flex-row sm:p-4",
                        step.status === "DONE" ? "border-emerald-400/20" : "border-white/10",
                        dropped && "opacity-55",
                        busy && "animate-pulse",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 gap-3">
                        <Link href={step.href} className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/10 sm:size-20">
                          {step.imageUrl ? <HdImage src={step.imageUrl} alt="" className="size-full object-cover" /> : null}
                          <span className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-caption font-bold text-white">
                            {step.position + 1}
                          </span>
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link href={step.href} className={cn("truncate text-sm font-semibold text-white hover:text-brand-pink sm:text-base", dropped && "line-through")}>
                              {step.title}
                            </Link>
                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-semibold", style.className)}>
                              <style.icon className="size-3" aria-hidden /> {style.label}
                            </span>
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-white/55">
                            <span>{step.focus}</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" aria-hidden /> ≈ {formatMinutes(step.estMinutes)}
                            </span>
                            {!dropped ? <span>{unit} {step.week}</span> : null}
                            {step.status === "IN_PROGRESS" && step.progressMinutes ? (
                              <span className="text-brand-pink">{formatMinutes(step.progressMinutes)} in</span>
                            ) : null}
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed text-white/75">{step.why}</p>
                          {step.stalled ? (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-200">
                              <TriangleAlert className="size-3.5" aria-hidden /> Haven&apos;t touched this in two weeks — want a swap?
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-row flex-wrap gap-1.5 sm:w-32 sm:flex-col">
                        {step.status === "DONE" ? (
                          <button type="button" disabled={busy} onClick={() => void stepAction(step, "undo")} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10 sm:flex-none">
                            <Undo2 className="size-3.5" aria-hidden /> Undo
                          </button>
                        ) : !dropped ? (
                          <button type="button" disabled={busy} onClick={() => void stepAction(step, "done")} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 sm:flex-none">
                            <Check className="size-3.5" aria-hidden /> Done
                          </button>
                        ) : null}
                        {step.status !== "DONE" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void stepAction(step, "replace")}
                            className={cn(
                              "inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-xs hover:bg-white/10 sm:flex-none",
                              step.stalled || dropped ? "border-amber-300/50 text-amber-100" : "border-white/15 text-white/75",
                            )}
                          >
                            <ArrowLeftRight className="size-3.5" aria-hidden /> Swap
                          </button>
                        ) : null}
                        {step.status !== "DONE" && !dropped ? (
                          <button type="button" disabled={busy} onClick={() => void stepAction(step, "drop")} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs text-white/50 hover:text-white sm:flex-none">
                            <X className="size-3.5" aria-hidden /> Drop
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </section>

      <section className="sticky bottom-20 z-20 flex flex-col gap-2 rounded-3xl border border-brand-magenta/30 bg-surface/95 p-3 shadow-card-inner backdrop-blur sm:p-4 lg:bottom-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Adjust the plan</p>
        <div className="flex flex-wrap gap-1.5">
          {ADJUST_CHIPS[mode].map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={building}
              onClick={() => void build(chip)}
              className="cursor-pointer rounded-full border border-brand-magenta/40 px-3 py-1 text-xs text-white/85 transition-colors hover:bg-brand-magenta/15"
            >
              {chip}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (instruction.trim().length >= 2) void build(instruction.trim());
          }}
        >
          <label htmlFor="roadmap-adjust" className="sr-only">
            How should the plan change?
          </label>
          <input
            id="roadmap-adjust"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            maxLength={300}
            placeholder={mode === "watch" ? "e.g. only 3 hours this week, swap the horror for comedy" : "e.g. more K-pop, fewer ballads"}
            className="h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none"
          />
          <button type="submit" disabled={building || instruction.trim().length < 2} aria-label="Adjust roadmap" className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-brand text-white disabled:cursor-not-allowed disabled:opacity-40">
            <Send className="size-4" aria-hidden />
          </button>
        </form>
      </section>
    </div>
  );
}
