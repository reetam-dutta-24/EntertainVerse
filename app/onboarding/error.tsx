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
      scope="onboarding"
      variant="page"
      title="We couldn't load your taste test"
      description="Your answers so far are safe. Try again, or skip to the dashboard and retake the test later."
    />
  );
}
