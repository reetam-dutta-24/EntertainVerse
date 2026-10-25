"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getAccentStyle } from "@/lib/accents";
import { getAccentTint, getTintOuterGlow, getTintRgb } from "@/lib/card-theme";
import { glassSurface } from "@/components/cards/glass-card-frame";
import type { AccentColor, Character } from "@/types";

export interface ContentCharacterCardProps {
  character: Character;
  contentId: string;
  contentAccent?: AccentColor;
  /** anime → Voice Actor; show/movie → Actor */
  castLabel?: "voice" | "actor";
  /** When false, fixed portrait with no hover expand or glow. */
  interactive?: boolean;
}

/** Character portrait — interactive: voice actor + glow on hover; static: fixed card only. */
export function ContentCharacterCard({
  character,
  contentAccent = "purple",
  castLabel = "actor",
  interactive = true,
}: ContentCharacterCardProps) {
  const [hovered, setHovered] = useState(false);
  const accent = getAccentStyle(character.accent ?? "purple");
  const tint = getAccentTint(contentAccent);
  const initials = character.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const castPrefix = castLabel === "voice" ? "Voice Actor" : "Actor";
  const subtitle = character.voiceActor
    ? `${castPrefix}: ${character.voiceActor}`
    : character.role;
  const isHovered = interactive && hovered;

  return (
    <article
      className={cn(
        "relative mx-auto shrink-0",
        interactive &&
          "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        interactive
          ? isHovered
            ? "z-20 w-[210px] scale-[1.03]"
            : "z-0 w-[168px] sm:w-[180px]"
          : "z-0 w-[168px] sm:w-[180px]",
      )}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl",
          interactive && "transition-all duration-500",
        )}
        style={{
          height: isHovered ? 322 : 268,
          backgroundColor: isHovered
            ? "rgba(0,0,0,0.65)"
            : "rgba(0,0,0,0.55)",
          boxShadow: isHovered
            ? `${getTintOuterGlow(tint.glass, 12)}, inset 0 -48px 56px ${tint.glass}`
            : "inset 0 -32px 40px rgba(0,0,0,0.65), inset 0 0 20px rgba(0,0,0,0.35)",
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {character.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.imageUrl}
              alt={character.name}
              className={cn(
                "size-full object-cover object-top",
                interactive && "transition-transform duration-500",
                isHovered && "scale-105",
              )}
            />
          ) : (
            // No portrait: tinted glass with the character's initials.
            <div
              className="relative flex size-full items-start justify-center pt-16"
              style={{ background: glassSurface(getTintRgb(getAccentTint(character.accent ?? contentAccent).glass).join(",")) }}
            >
              <div className={cn("absolute inset-x-0 top-0 h-1/2 opacity-40", accent.header)} aria-hidden />
              <span className="relative flex size-20 items-center justify-center rounded-full bg-white/10 text-2xl font-extrabold tracking-wide text-white/90 ring-1 ring-white/20 backdrop-blur-md">
                {initials}
              </span>
            </div>
          )}
          <div
            className={cn(
              "absolute inset-0",
              interactive && "transition-all duration-500",
            )}
            style={{
              boxShadow: isHovered
                ? "inset 0 -72px 60px rgba(0,0,0,0.75)"
                : "inset 0 -48px 36px rgba(0,0,0,0.75)",
            }}
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 pb-3 pt-12">
          <p
            className={cn(
              "line-clamp-2 font-bold leading-tight text-white",
              interactive && "transition-all duration-300",
              isHovered ? "text-lg" : "text-base",
            )}
          >
            {character.name}
          </p>
          {interactive ? (
            <p
              className={cn(
                "text-white/85 transition-all duration-300",
                isHovered
                  ? "mt-1 max-h-8 text-xs opacity-100"
                  : "max-h-0 overflow-hidden text-caption opacity-0",
              )}
            >
              {subtitle}
            </p>
          ) : subtitle ? (
            <p className="mt-0.5 text-caption text-white/70">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
