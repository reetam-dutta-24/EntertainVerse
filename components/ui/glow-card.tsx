import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const glowCardVariants = cva("relative overflow-hidden rounded-card", {
  variants: {
    glow: {
      pink: "shadow-glow-pink",
      purple: "shadow-glow-purple",
      cyan: "shadow-glow-cyan",
      blue: "shadow-glow-blue",
      none: "",
    },
  },
  defaultVariants: {
    glow: "pink",
  },
});

export interface GlowCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glowCardVariants> {}

/**
 * Card wrapper with the neon outer glow from Figma (poster, community,
 * and collection cards). Compose with GlassCard or a solid background.
 */
export function GlowCard({ className, glow, ...props }: GlowCardProps) {
  return (
    <div className={cn(glowCardVariants({ glow }), className)} {...props} />
  );
}
