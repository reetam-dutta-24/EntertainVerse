/** Demo preview streams for in-app playlist playback until per-track URLs are stored in DB. */
const DEMO_PREVIEW_URLS = [
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
];

/** Full audio file first, then the official 30s preview clip, then a demo track. */
export function getTrackPreviewUrl(
  slug: string,
  audioUrl?: string | null,
  previewUrl?: string | null,
): string {
  if (audioUrl?.trim()) return audioUrl.trim();
  if (previewUrl?.trim()) return previewUrl.trim();
  const hash = slug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DEMO_PREVIEW_URLS[hash % DEMO_PREVIEW_URLS.length]!;
}

/** Resolve a track's display cover — never falls back to artist/playlist art. */
export function getTrackCoverUrl(
  slug: string,
  imageUrl?: string | null,
  backdropUrl?: string | null,
): string {
  return imageUrl ?? backdropUrl ?? `/images/posters/${slug}.jpg`;
}

export function formatTrackDuration(
  durationSeconds?: number | null,
  durationLabel?: string | null,
): string {
  if (durationLabel?.trim()) return durationLabel.trim();
  if (!durationSeconds || durationSeconds <= 0) return "—";
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
