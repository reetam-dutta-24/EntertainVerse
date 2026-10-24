/**
 * Progress events streamed from the admin AI routes as NDJSON (one JSON object
 * per line). Client-safe — no server imports.
 */

export interface AiProgressStep {
  /** Human label for the step that just started, e.g. "Drafting with Google Gemini". */
  label: string;
  /** Percent reached when this step starts. */
  percent: number;
  /** Percent the bar may creep toward while this step runs. */
  ceiling: number;
}

export type AiStreamEvent<T> =
  | ({ type: "progress" } & AiProgressStep)
  | { type: "result"; data: T }
  | { type: "error"; message: string; status: number };

export type ProgressReporter = (step: AiProgressStep) => void;
