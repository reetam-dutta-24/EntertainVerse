"use client";

import { useEffect, useRef } from "react";

const TICK_MS = 15_000;

/**
 * Reports real playback time: while `active`, counts seconds and posts each full
 * minute to `endpoint` (one session per item — the server adds to the same event).
 * On stop / switch, a final partial minute of 30s+ is sent too.
 *
 * `requireVisible`: only count while the tab is visible (video); music keeps
 * counting in the background.
 */
export function usePlaybackMinutes(endpoint: string | null, active: boolean, { requireVisible = false } = {}) {
  const session = useRef<{ endpoint: string; id?: string } | null>(null);
  const seconds = useRef(0);

  useEffect(() => {
    if (!endpoint) return;
    if (session.current?.endpoint !== endpoint) {
      session.current = { endpoint };
      seconds.current = 0;
    }
  }, [endpoint]);

  useEffect(() => {
    if (!endpoint || !active) return;
    const send = (minutes: number) => {
      const current = session.current;
      if (!current || current.endpoint !== endpoint) return;
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: current.id, minutes }),
        keepalive: true,
      })
        .then((response) => response.json())
        .then((data: { sessionId?: string }) => {
          if (data.sessionId && session.current?.endpoint === endpoint) session.current.id = data.sessionId;
        })
        .catch(() => undefined);
    };

    const timer = window.setInterval(() => {
      if (requireVisible && document.visibilityState !== "visible") return;
      seconds.current += TICK_MS / 1000;
      if (seconds.current >= 60) {
        const minutes = Math.floor(seconds.current / 60);
        seconds.current -= minutes * 60;
        send(minutes);
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(timer);
      // Stopped or switched: keep a meaningful partial minute.
      if (seconds.current >= 30) send(1);
      seconds.current = 0;
    };
  }, [endpoint, active, requireVisible]);
}
