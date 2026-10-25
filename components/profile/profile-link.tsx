"use client";

import Link from "next/link";
import { useAppRouter } from "@/hooks/use-app-router";
import { getProfilePath } from "@/lib/profile-routes";
import { cn } from "@/lib/utils";

export interface ProfileLinkProps {
  /** Public handle — or the user id where only that is known (the profile route resolves both). */
  handle?: string | null;
  /** Used for the accessible label: "View Alice's profile". */
  name: string;
  /**
   * Set when the avatar sits inside another link or button (e.g. a DM conversation row):
   * HTML can't nest interactive elements, so it renders a keyboard-accessible pseudo-link
   * that opens the profile without triggering the row.
   */
  nested?: boolean;
  /** Open in a new tab — inside live parties, where leaving the page would drop you out. */
  newTab?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Wrap any user avatar so it opens that user's profile. Renders the avatar as-is without a handle. */
export function ProfileLink({ handle, name, nested = false, newTab = false, className, children }: ProfileLinkProps) {
  const router = useAppRouter();
  if (!handle) return <>{children}</>;
  const href = getProfilePath(handle);
  const label = `View ${name}'s profile${newTab ? " (opens in a new tab)" : ""}`;
  const classes = cn("inline-flex shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-magenta", className);

  if (nested) {
    const open = (event: React.SyntheticEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (newTab) window.open(href, "_blank", "noopener");
      else router.push(href);
    };
    return (
      <span
        role="link"
        tabIndex={0}
        aria-label={label}
        title={label}
        className={classes}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === "Enter") open(event);
        }}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={classes}
      onClick={(event) => event.stopPropagation()}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </Link>
  );
}
