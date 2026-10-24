import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doesn't know the custom AniVerse theme utilities, so we
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
        "text-subtitle",
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
        "shadow-panel",
      ],
      rounded: [
        "rounded-xl",
        "rounded-lg",
        "rounded-card",
        "rounded-card",
        "rounded-card",
        "rounded-card",
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
      ],
    },
  },
});

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
