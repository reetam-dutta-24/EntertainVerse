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
      scope="community-dashboard"
      title="This channel failed to load"
      description="The rest of the community is still here — try reloading this section."
    />
  );
}
