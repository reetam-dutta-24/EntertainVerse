"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiProgressStep, AiStreamEvent } from "@/lib/ai/progress-types";

export interface AiTaskProgress {
  label: string;
  percent: number;
  elapsedSeconds: number;
}

/**
 * How far the bar closes the gap to the step's ceiling every tick (250ms).
 * Tuned so a 30-60s model call keeps visibly moving (~80% at 35s, ~88% at 60s).
 */
const CREEP = 0.012;

/**
 * POST to a streaming admin AI route and expose live progress.
 * Real step events move the bar; between them it creeps toward the current
 * step's ceiling so long model calls never look frozen.
 */
export function useAiTask<T>() {
  const [progress, setProgress] = useState<AiTaskProgress | null>(null);
  const step = useRef<AiProgressStep | null>(null);
  const startedAt = useRef(0);

  const running = progress !== null;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (!current || !step.current) return current;
        const { ceiling } = step.current;
        const percent = current.percent + Math.max(0, ceiling - current.percent) * CREEP;
        return {
          ...current,
          percent: Math.min(percent, ceiling),
          elapsedSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
        };
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [running]);

  const run = useCallback(async (url: string, body: unknown): Promise<T> => {
    startedAt.current = Date.now();
    step.current = { label: "Starting…", percent: 2, ceiling: 8 };
    setProgress({ label: "Starting…", percent: 2, elapsedSeconds: 0 });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Auth / validation failures come back as plain JSON before any streaming.
      if (!response.headers.get("content-type")?.includes("ndjson")) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Request failed.");
      }
      if (!response.body) throw new Error("No response stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline !== -1) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf("\n");
          if (!line) continue;

          const event = JSON.parse(line) as AiStreamEvent<T>;
          if (event.type === "progress") {
            step.current = event;
            setProgress((current) => ({
              label: event.label,
              percent: Math.max(current?.percent ?? 0, event.percent),
              elapsedSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
            }));
          } else if (event.type === "error") {
            throw new Error(event.message);
          } else {
            setProgress((current) => (current ? { ...current, label: "Done", percent: 100 } : current));
            return event.data;
          }
        }
      }
      throw new Error("The connection closed before the result arrived.");
    } finally {
      // Let the bar sit at 100% briefly before it disappears.
      window.setTimeout(() => {
        step.current = null;
        setProgress(null);
      }, 400);
    }
  }, []);

  return { run, progress, running };
}
