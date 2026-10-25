"use client";

import { useState } from "react";
import { ImageIcon, Play } from "lucide-react";
import { youtubeId } from "@/components/content/trailer-facade";

/**
 * "Watch trailer" for the detail hero's image panel: the poster stays by default;
 * the trailer plays right there in the panel (privacy-enhanced embed), with a way back.
 */
export function HeroTrailerToggle({ trailerUrl, title }: { trailerUrl: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(trailerUrl);
  if (!id) return null;

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="absolute left-4 top-4 z-20 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/55 px-4 py-2 text-sm font-semibold text-white shadow-card-inner backdrop-blur-md transition-colors hover:border-brand-magenta/60 hover:bg-black/70"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-gradient-brand">
          <Play className="ms-0.5 size-3.5 fill-white text-white" aria-hidden />
        </span>
        Watch trailer
      </button>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
        title={`${title} — official trailer`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="min-h-0 w-full flex-1 border-0"
      />
      <button
        type="button"
        onClick={() => setPlaying(false)}
        className="absolute left-4 top-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-black/85"
      >
        <ImageIcon className="size-4" aria-hidden /> Back to poster
      </button>
    </div>
  );
}
