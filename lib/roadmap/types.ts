/** Client-safe shapes for AI roadmaps. */

export type RoadmapStepStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "DROPPED";
export type RoadmapStepKind = "content" | "track" | "artist";

export interface RoadmapAnalysis {
  headline: string;
  paragraphs: string[];
  /** Short taste-trait chips. */
  strengths: string[];
  /** Practical tips for following the plan. */
  tips: string[];
}

export interface RoadmapStepView {
  id: string;
  position: number;
  phase: string;
  kind: RoadmapStepKind;
  slug: string;
  title: string;
  imageUrl?: string;
  focus: string;
  why: string;
  estMinutes: number;
  week: number;
  status: RoadmapStepStatus;
  progressMinutes: number;
  replacedTitle?: string;
  /** In progress but untouched for two weeks — offer a replacement. */
  stalled: boolean;
  href: string;
}

export interface RoadmapView {
  id: string;
  mode: "watch" | "listen";
  title: string;
  analysis: RoadmapAnalysis;
  weeklyHours: number | null;
  /** Hours/week the schedule assumed (the user's answer, or the default pace). */
  scheduledHours: number;
  aiWritten: boolean;
  createdAt: string;
  totalMinutes: number;
  doneMinutes: number;
  doneSteps: number;
  progressPercent: number;
  weeks: number;
  steps: RoadmapStepView[];
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = minutes / 60;
  return hours < 10 ? `${Math.round(hours * 2) / 2} h` : `${Math.round(hours)} h`;
}
