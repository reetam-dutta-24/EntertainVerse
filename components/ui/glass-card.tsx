import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const glassCardVariants = cva(
  "relative overflow-hidden rounded-card shadow-card-inner",
  {
    variants: {
      tint: {
        magenta: "bg-glass-magenta",
        cyan: "bg-glass-cyan",
        purple: "bg-glass-purple",
      },
    },
    defaultVariants: {
      tint: "magenta",
    },
  },
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

/**
 * Translucent tinted panel with the soft inner shadow used across
 * EntertainVerse cards (18% color fill over the dark background).
 */
export function GlassCard({ className, tint, ...props }: GlassCardProps) {
  return (
    <div className={cn(glassCardVariants({ tint }), className)} {...props} />
  );
}
