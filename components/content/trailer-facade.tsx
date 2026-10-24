"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/** Extract the video id from youtube.com/watch?v=…, youtu.be/…, or /embed/… URLs. */
export function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1]! : null;
}

/**
 * Lightweight trailer: shows the thumbnail until clicked, then loads the
 * privacy-enhanced YouTube embed. Keeps the detail page fast.
 */
export function TrailerFacade({ url, title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(url);
  if (!id) return null;

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={`${title} trailer`}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-2xl border-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play the ${title} trailer`}
      className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-2xl bg-ink"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        className="size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
      <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-brand shadow-glow-pink transition-transform group-hover:scale-105">
        <Play className="ms-1 size-7 fill-white text-white" aria-hidden />
      </span>
      <span className="absolute bottom-3 left-4 text-sm font-semibold text-white">Official trailer</span>
    </button>
  );
}
