"use client";

import { useEffect, useRef } from "react";

export interface PlayerShortcutHandlers {
  onTogglePlay: () => void;
  /** Seek relative to the current position, in seconds. */
  onSeekBy: (deltaSeconds: number) => void;
  onToggleMute: () => void;
}

const SEEK_STEP_SECONDS = 5;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    // Space/Enter on a focused button should press that button, not the player.
    tag === "BUTTON"
  );
}

/** Space / K play-pause · ← → seek 5s · M mute. Ignored while typing or with modifiers. */
export function usePlayerShortcuts(handlers: PlayerShortcutHandlers, enabled = true) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const { onTogglePlay, onSeekBy, onToggleMute } = latest.current;
      switch (event.key) {
        case " ":
        case "k":
        case "K":
          event.preventDefault();
          onTogglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          onSeekBy(-SEEK_STEP_SECONDS);
          break;
        case "ArrowRight":
          event.preventDefault();
          onSeekBy(SEEK_STEP_SECONDS);
          break;
        case "m":
        case "M":
          onToggleMute();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
