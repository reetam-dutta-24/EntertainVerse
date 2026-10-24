import "server-only";

import { z } from "zod";
import { activeProviderLabel, generateStructured, researchWithWeb } from "@/lib/ai/provider";
import type { ProgressReporter } from "@/lib/ai/progress-types";

export type ReviewSeverity = "error" | "warning" | "suggestion";

export interface ReviewIssue {
  /** A form field key, or "general". */
  field: string;
  severity: ReviewSeverity;
  message: string;
  /** A value the admin can apply in one click (string form). */
  suggestedValue: string | null;
  origin: "rules" | "ai";
}

export interface CatalogReviewResult {
  summary: string;
  issues: ReviewIssue[];
  checkedOnline: boolean;
  sources: { title: string; url: string }[];
}

/** Collects rule-based issues for one form. */
export function issueCollector() {
  const issues: ReviewIssue[] = [];
  const add = (field: string, severity: ReviewSeverity, message: string, suggestedValue: string | null = null) =>
    issues.push({ field, severity, message, suggestedValue, origin: "rules" });
  return { issues, add };
}

/** Every schema violation as an error on its field. */
export function schemaIssues(schema: z.ZodType, form: unknown, add: ReturnType<typeof issueCollector>["add"]) {
  const parsed = schema.safeParse(form);
  if (parsed.success) return;
  for (const issue of parsed.error.issues) {
    const field = typeof issue.path[0] === "string" ? issue.path[0] : "general";
    add(field, "error", `${issue.path.join(".") || "Form"}: ${issue.message}`);
  }
}

const ORDER: Record<ReviewSeverity, number> = { error: 0, warning: 1, suggestion: 2 };

/** Result when no AI provider is configured: the rule checks only. */
export function ruleOnlyReview(issues: ReviewIssue[]): CatalogReviewResult {
  return {
    summary: "Automatic checks only — add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to enable the AI review.",
    issues: [...issues].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]),
    checkedOnline: false,
    sources: [],
  };
}

export interface AiReviewRequest {
  /** e.g. "catalog entries", "song entries". */
  subject: string;
  fieldKeys: string[];
  /** House formats and allowed vocabularies for this catalog. */
  houseRules: string;
  /** The form as the model should see it (long lists already compacted). */
  form: unknown;
  ruleIssues: ReviewIssue[];
  facts?: Record<string, unknown>;
  /** Set to verify facts on the web first. */
  research?: { label: string; instructions: string };
}

/** Rule issues + the AI provider's review, merged and sorted by severity. */
export async function runAiReview(request: AiReviewRequest, report: ProgressReporter): Promise<CatalogReviewResult> {
  let facts = request.facts;
  let sources: CatalogReviewResult["sources"] = [];

  if (request.research) {
    report({ label: request.research.label, percent: 12, ceiling: 45 });
    const research = await researchWithWeb(request.research.instructions);
    facts = { ...(facts ?? {}), webFactSheet: research.factSheet };
    sources = research.sources;
  }

  const reviewSchema = z.object({
    summary: z.string(),
    issues: z.array(
      z.object({
        field: z.enum([...request.fieldKeys, "general"] as [string, ...string[]]),
        severity: z.enum(["error", "warning", "suggestion"]),
        message: z.string(),
        suggestedValue: z.string().nullable(),
      }),
    ),
  });

  report({
    label: `Reviewing ${request.fieldKeys.length} fields with ${activeProviderLabel()}`,
    percent: request.research ? 50 : 15,
    ceiling: 94,
  });
  const out = await generateStructured({
    depth: "deep",
    schema: reviewSchema,
    system:
      `You review ${request.subject} for AniVerse before an admin publishes them. Find values that are wrong, ` +
      "inconsistent with each other, implausible for this title, badly formatted, or important but missing.\n\n" +
      `${request.houseRules}\n\n` +
      "Rules:\n- When reference facts are provided, treat them as the source of truth and flag every conflict as an error.\n" +
      "- Without reference facts, only flag a factual value when you are confident it is wrong; phrase it as \"likely\" and use warning.\n" +
      "- Don't repeat issues already found by the automatic checks.\n" +
      "- suggestedValue must be the exact replacement value for that field (comma-separated for list fields), or null.\n" +
      "- No issue for empty optional fields unless they matter for this title. An empty issue list is a valid result.\n" +
      "- summary: one sentence on overall readiness.",
    prompt:
      (facts ? `Reference facts:\n${JSON.stringify(facts, null, 2)}\n\n` : "No reference facts — rely on well-established knowledge only.\n\n") +
      `Already found by automatic checks:\n${JSON.stringify(request.ruleIssues.map((i) => `${i.field}: ${i.message}`))}\n\n` +
      `Catalog entry:\n${JSON.stringify(request.form, null, 2)}`,
  });

  const aiIssues: ReviewIssue[] = out.issues.map((issue) => ({ ...issue, origin: "ai" as const }));
  return {
    summary: out.summary,
    issues: [...request.ruleIssues, ...aiIssues].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]),
    checkedOnline: Boolean(request.research),
    sources,
  };
}
