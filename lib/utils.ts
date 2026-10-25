import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doesn't know the custom EntertainVerse theme utilities, so we
 * register them in their proper conflict groups (e.g. `text-title` is a
 * font size, not a text color).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-title",
        "text-heading",
        "text-lead",
        "text-subtitle",
        "text-body",
        "text-small",
        "text-caption",
        "text-micro",
      ],
      shadow: [
        "shadow-glow-pink",
        "shadow-glow-pink-soft",
        "shadow-glow-purple",
        "shadow-glow-cyan",
        "shadow-glow-blue",
        "shadow-glow-green",
        "shadow-glow-yellow",
        "shadow-card-inner",
        "shadow-card-lift",
        "shadow-hover-card",
        "shadow-section-dim",
        "shadow-panel",
      ],
      rounded: [
        "rounded-lg",
        "rounded-xl",
        "rounded-2xl",
        "rounded-card",
        "rounded-3xl",
        "rounded-full",
      ],
      "bg-image": [
        "bg-gradient-brand",
        "bg-gradient-blue-violet",
        "bg-gradient-indigo",
        "bg-gradient-teal",
        "bg-header-purple",
        "bg-header-blue",
        "bg-header-cyan",
        "bg-header-green",
        "bg-header-yellow",
        "bg-header-pink",
        // Genre / type chip gradients (bg-gradient-chip-action, …).
        { "bg-gradient-chip": [(value: string) => /^[a-z]+$/.test(value)] },
      ],
    },
  },
});

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
