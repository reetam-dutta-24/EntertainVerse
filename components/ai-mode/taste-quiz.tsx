"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { answerFor, quizFor, withAnswer, type QuizQuestion } from "@/lib/ai-profile/quiz";
import type { AiMode, ListenPrefs, WatchPrefs } from "@/lib/ai-profile/schema";
import { cn } from "@/lib/utils";

export interface TasteQuizProps<P extends WatchPrefs | ListenPrefs> {
  mode: AiMode;
  initial: P;
  onDone: (prefs: P) => void;
  onCancel: () => void;
}

function OptionTile({
  question,
  option,
  selected,
  onToggle,
}: {
  question: QuizQuestion;
  option: QuizQuestion["options"][number];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-3 text-center transition-all duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink",
        selected
          ? "border-brand-magenta bg-brand-magenta/15 shadow-[0_0_24px_rgba(255,0,204,0.25)]"
          : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]",
      )}
    >
      {selected ? (
        <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-gradient-brand">
          <Check className="size-3 text-white" aria-hidden />
        </span>
      ) : null}
      <span className="text-2xl" aria-hidden>
        {option.emoji}
      </span>
      <span className="text-sm font-semibold text-white">{option.label}</span>
      {question.showPhrase ? <span className="text-caption leading-4 text-white/60">{option.phrase}</span> : null}
    </button>
  );
}

/**
 * Animated taste quiz: one card per question, tap to answer. Single-choice
 * cards advance on their own; multi-choice cards respect a max.
 */
export function TasteQuiz<P extends WatchPrefs | ListenPrefs>({ mode, initial, onDone, onCancel }: TasteQuizProps<P>) {
  const questions = quizFor(mode);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [prefs, setPrefs] = useState<P>(initial);
  const question = questions[index]!;
  const selected = answerFor(prefs, question);
  const isLast = index === questions.length - 1;
  const canContinue = question.optional || selected.length > 0;

  function go(step: number) {
    const next = index + step;
    if (next < 0) return onCancel();
    if (next >= questions.length) return onDone(prefs);
    setDirection(step);
    setIndex(next);
  }

  function toggle(id: string) {
    let values: string[];
    if (question.kind === "multi") {
      values = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
      if (question.max && values.length > question.max) values = values.slice(values.length - question.max);
    } else {
      values = selected.includes(id) ? [] : [id];
    }
    const nextPrefs = withAnswer(prefs, question, values);
    setPrefs(nextPrefs);
    // Single picks move on by themselves — feels like flipping cards.
    if (question.kind !== "multi" && values.length) {
      window.setTimeout(() => (isLast ? onDone(nextPrefs) : go(1)), 260);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={index + 1} aria-label="Quiz progress">
          <motion.div className="h-full rounded-full bg-gradient-brand" animate={{ width: `${((index + 1) / questions.length) * 100}%` }} transition={{ duration: 0.35 }} />
        </div>
        <span className="shrink-0 text-xs text-white/55">
          {index + 1} / {questions.length}
        </span>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.section
            key={question.field}
            custom={direction}
            initial={{ opacity: 0, x: direction * 48, rotate: direction * 1.5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: direction * -48, rotate: direction * -1.5 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-brand-purple/20 via-surface to-surface p-4 shadow-card-inner sm:p-6"
            aria-live="polite"
          >
            <div>
              <h2 className="text-lg font-bold text-white sm:text-xl">{question.title}</h2>
              <p className="mt-1 text-sm text-white/60">
                {question.subtitle}
                {question.kind === "multi" && question.max ? ` · ${selected.length}/${question.max}` : ""}
              </p>
            </div>
            <div
              className={cn(
                "grid gap-2.5",
                question.showPhrase ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
              )}
            >
              {question.options.map((option) => (
                <OptionTile
                  key={option.id}
                  question={question}
                  option={option}
                  selected={selected.includes(option.id)}
                  onToggle={() => toggle(option.id)}
                />
              ))}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => go(-1)}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 sm:w-auto"
        >
          <ArrowLeft className="size-4" aria-hidden /> {index === 0 ? "Back" : "Previous"}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          {question.optional && !selected.length ? (
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm text-white/60 transition-colors hover:text-white sm:w-auto"
            >
              Skip
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => go(1)}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {isLast ? (
              <>
                <Sparkles className="size-4" aria-hidden /> See my picks
              </>
            ) : (
              <>
                Next <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
