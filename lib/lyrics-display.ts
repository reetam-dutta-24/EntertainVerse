export interface LyricLineView {
  text: string;
  active: boolean;
  past: boolean;
}

export function parseLyricsText(lyrics?: string | null): string[] {
  if (!lyrics?.trim()) return [];
  return lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Spotify-style window: up to 4 lines centered on the line being sung. */
export function getLyricWindow(
  lyrics: string[] | undefined,
  progressSeconds: number,
  durationSeconds: number,
  maxLines = 4,
): LyricLineView[] {
  if (!lyrics?.length || durationSeconds <= 0) return [];

  const progress = Math.max(0, Math.min(progressSeconds, durationSeconds));
  const activeIndex = Math.min(
    lyrics.length - 1,
    Math.floor((progress / durationSeconds) * lyrics.length),
  );

  const half = Math.floor(maxLines / 2);
  let start = Math.max(0, activeIndex - half);
  const end = Math.min(lyrics.length, start + maxLines);
  start = Math.max(0, end - maxLines);

  return lyrics.slice(start, end).map((text, offset) => {
    const index = start + offset;
    return {
      text,
      active: index === activeIndex,
      past: index < activeIndex,
    };
  });
}

export function splitTextLines(text?: string | null, maxLines = 4): string[] {
  if (!text?.trim()) return [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines.slice(0, maxLines * 3);
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Content binge panel — show 4 synopsis lines for the active queue item. */
export function getSynopsisWindow(
  synopsis: string | undefined,
  activeIndex: number,
  maxLines = 4,
): string[] {
  const lines = splitTextLines(synopsis);
  if (!lines.length) return [];
  const start = Math.min(
    Math.max(0, activeIndex * 2),
    Math.max(0, lines.length - maxLines),
  );
  return lines.slice(start, start + maxLines);
}
