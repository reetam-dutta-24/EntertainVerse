"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useOptionalContentEngagement } from "@/components/content/content-engagement-context";

export interface ContentWatchNowLinkProps extends ComponentProps<typeof Link> {
  contentSlug: string;
}

/** Watch now link — records global "currently watching" before navigation. */
export function ContentWatchNowLink({
  contentSlug,
  onClick,
  ...props
}: ContentWatchNowLinkProps) {
  const engagement = useOptionalContentEngagement();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    void fetch(`/api/content/${encodeURIComponent(contentSlug)}/watch-start`, {
      method: "POST",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: { watching?: number; onWatchlist?: boolean } | null) => {
          if (data?.watching != null) {
            engagement?.applyWatching(data.watching, data.onWatchlist);
          }
        },
      )
      .catch(() => undefined);
  }

  return <Link {...props} onClick={handleClick} />;
}
