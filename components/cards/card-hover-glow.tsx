import { cn } from "@/lib/utils";
import { getTintGlowStyles } from "@/lib/card-theme";

export interface CardHoverGlowProps {
  active: boolean;
  width: number;
  height: number;
  /** Card glass tint — drives theme-colored ambient glow. */
  tintGlass?: string;
}

/**
 * Soft Spotify-style ambient wash — theme tint only, no heavy box-shadow.
 */
export function CardHoverGlow({
  active,
  width,
  height,
  tintGlass,
}: CardHoverGlowProps) {
  const glow = tintGlass ? getTintGlowStyles(tintGlass) : null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 z-0 transition-opacity duration-500 ease-out",
        active ? "opacity-100" : "opacity-0",
      )}
      style={{
        width,
        height,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="absolute -inset-5 rounded-3xl blur-2xl transition-[opacity,transform] duration-500 ease-out"
        style={{
          background:
            glow?.radial ??
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(138,56,245,0.18) 0%, rgba(138,56,245,0.08) 50%, transparent 72%)",
          opacity: active ? 1 : 0,
          transform: active ? "scale(1)" : "scale(0.96)",
        }}
      />
    </div>
  );
}
