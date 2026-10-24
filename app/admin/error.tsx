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
      scope="admin"
      title="CMS hit an error"
      description="This admin view failed to load. No changes were saved from the failed request."
      homeHref="/admin"
      homeLabel="Back to CMS overview"
    />
  );
}
