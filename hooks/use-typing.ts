"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const RESEND_MS = 2_000;
const IDLE_MS = 3_000;
const SHOW_MS = 5_000;

/**
 * Tell others you're typing: "typing" at most every 2s while keys are pressed,
 * then "stopped" after 3s idle (or right away on send).
 */
export function useTypingSender(send: (typing: boolean) => void) {
  const lastSent = useRef(0);
  const idleTimer = useRef<number | undefined>(undefined);
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });

  const stop = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    if (lastSent.current) sendRef.current(false);
    lastSent.current = 0;
  }, []);

  const onInput = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current > RESEND_MS) {
      lastSent.current = now;
      sendRef.current(true);
    }
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(stop, IDLE_MS);
  }, [stop]);

  useEffect(() => () => window.clearTimeout(idleTimer.current), []);
  return { onInput, stop };
}

export interface Typer {
  userId: string;
  name?: string;
}

/** Who is typing right now; entries expire on their own if a "stopped" never arrives. */
export function useTypers() {
  const [typers, setTypers] = useState<Typer[]>([]);
  const timers = useRef(new Map<string, number>());

  const applyTyping = useCallback((typer: Typer, typing: boolean) => {
    window.clearTimeout(timers.current.get(typer.userId));
    if (!typing) {
      timers.current.delete(typer.userId);
      setTypers((current) => current.filter((entry) => entry.userId !== typer.userId));
      return;
    }
    timers.current.set(
      typer.userId,
      window.setTimeout(() => setTypers((current) => current.filter((entry) => entry.userId !== typer.userId)), SHOW_MS),
    );
    setTypers((current) => (current.some((entry) => entry.userId === typer.userId) ? current : [...current, typer]));
  }, []);

  const clearTypers = useCallback(() => {
    for (const timer of timers.current.values()) window.clearTimeout(timer);
    timers.current.clear();
    setTypers([]);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer);
    };
  }, []);

  return { typers, applyTyping, clearTypers };
}

/** "Mika is typing…", "Mika and Ren are typing…", "3 people are typing…" */
export function typingLabel(typers: Typer[]) {
  const names = typers.map((typer) => typer.name ?? "Someone");
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names.length} people are typing…`;
}
