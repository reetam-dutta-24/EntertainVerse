"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorState
      error={error}
      retry={unstable_retry}
      scope="collection"
      title="Couldn't load this collection"
      description="Something went wrong on our side while loading this page. Try again in a moment."
    />
  );
}
