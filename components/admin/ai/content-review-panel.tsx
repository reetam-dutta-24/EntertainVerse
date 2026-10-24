"use client";

import { useState } from "react";
import { Check, CircleAlert, ExternalLink, Info, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { fieldLabel } from "@/components/admin/ai/import-summary";
import type { ContentReviewResult, ReviewIssue, ReviewSeverity } from "@/lib/ai/content-review";
import type { ContentFormInput } from "@/lib/validators/admin/content";
import { cn } from "@/lib/utils";

const SEVERITY: Record<ReviewSeverity, { icon: typeof Info; label: string; className: string }> = {
  error: { icon: CircleAlert, label: "Error", className: "border-red-400/40 text-red-200" },
  warning: { icon: TriangleAlert, label: "Check", className: "border-amber-300/40 text-amber-100" },
  suggestion: { icon: Info, label: "Tip", className: "border-white/15 text-white/75" },
};

export interface ContentReviewPanelProps {
  form: ContentFormInput;
  /** Facts from the last import — lets the reviewer check against the source. */
  facts?: Record<string, unknown>;
  aiEnabled: boolean;
  providerLabel?: string;
  canApply: (field: ReviewIssue["field"]) => boolean;
  onApply: (field: ReviewIssue["field"], value: string) => void;
}

/** "Review with AI": rule checks + the AI provider's review, with one-click fixes. */
export function ContentReviewPanel({ form, facts, aiEnabled, providerLabel, canApply, onApply }: ContentReviewPanelProps) {
  const [verifyOnline, setVerifyOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ContentReviewResult | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function runReview() {
    setLoading(true);
    setError(null);
    setApplied(new Set());
    try {
      const response = await fetch("/api/admin/ai/content/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, facts, verifyOnline }),
      });
      const data = (await response.json()) as { review?: ContentReviewResult; error?: string };
      if (!response.ok || !data.review) throw new Error(data.error ?? "Review failed.");
      setReview(data.review);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Review failed.");
    } finally {
      setLoading(false);
    }
  }

  const counts = review
    ? (["error", "warning", "suggestion"] as const).map((severity) => ({
        severity,
        count: review.issues.filter((issue) => issue.severity === severity).length,
      }))
    : [];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-pink" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-white">Review before publishing</h2>
            <p className="mt-1 text-xs text-white/50">
              {aiEnabled
                ? `Checks every field for errors, inconsistencies and likely-wrong facts${providerLabel ? ` · ${providerLabel}` : ""}.`
                : "Automatic consistency checks (add GEMINI_API_KEY or ANTHROPIC_API_KEY for the AI review)."}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => void runReview()}
            disabled={loading}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {loading ? "Reviewing…" : review ? "Review again" : aiEnabled ? "Review with AI" : "Run checks"}
          </button>
          {aiEnabled ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={verifyOnline}
                onChange={(event) => setVerifyOnline(event.target.checked)}
                className="accent-brand-magenta"
              />
              Verify facts online (slower)
            </label>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {review ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="text-sm text-white/80">{review.summary}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {counts.map(({ severity, count }) => (
              <span key={severity} className={cn("rounded-full border px-2.5 py-0.5", SEVERITY[severity].className)}>
                {count} {SEVERITY[severity].label.toLowerCase()}
                {count === 1 ? "" : "s"}
              </span>
            ))}
            {facts ? <span className="rounded-full border border-emerald-400/30 px-2.5 py-0.5 text-emerald-100">Checked against import source</span> : null}
            {review.checkedOnline ? <span className="rounded-full border border-emerald-400/30 px-2.5 py-0.5 text-emerald-100">Verified online</span> : null}
          </div>

          {review.issues.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-emerald-200">
              <Check className="size-4" aria-hidden /> No problems found.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {review.issues.map((issue, index) => {
                const { icon: Icon, className } = SEVERITY[issue.severity];
                const isApplied = applied.has(index);
                const applicable = issue.suggestedValue !== null && canApply(issue.field);
                return (
                  <li key={`${issue.field}-${index}`} className={cn("flex gap-3 rounded-xl border bg-black/20 p-3", className)}>
                    <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                        {issue.field === "general" ? "General" : fieldLabel(issue.field)}
                        <span className="ms-2 font-normal normal-case tracking-normal text-white/35">
                          {issue.origin === "rules" ? "automatic check" : "AI review"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-white/85">{issue.message}</p>
                      {issue.suggestedValue !== null && issue.suggestedValue !== "" ? (
                        <p className="mt-1 truncate text-xs text-white/55">
                          Suggested: <span className="font-mono text-white/80">{issue.suggestedValue}</span>
                        </p>
                      ) : null}
                    </div>
                    {applicable ? (
                      <button
                        type="button"
                        disabled={isApplied}
                        onClick={() => {
                          onApply(issue.field, issue.suggestedValue ?? "");
                          setApplied((current) => new Set(current).add(index));
                        }}
                        className="h-8 shrink-0 cursor-pointer self-center rounded-lg border border-white/20 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-default disabled:border-emerald-400/40 disabled:text-emerald-200"
                      >
                        {isApplied ? "Applied" : "Apply"}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {review.sources.length ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {review.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[240px] items-center gap-1 truncate text-brand-pink hover:underline">
                  {source.title || source.url} <ExternalLink className="size-3 shrink-0" aria-hidden />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
