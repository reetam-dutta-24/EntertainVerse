"use client";

import "./globals.css";
import { ErrorState } from "@/components/feedback/error-state";

/** Last-resort boundary — replaces the root layout, so it renders its own document. */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <title>Something went wrong — AniVerse</title>
        <ErrorState
          error={error}
          retry={unstable_retry}
          scope="global"
          variant="page"
          title="AniVerse hit a critical error"
          description="The app couldn't start properly. Try again — if it keeps happening, refresh the page or come back in a few minutes."
          homeHref="/"
          homeLabel="Back to home"
        />
      </body>
    </html>
  );
}
