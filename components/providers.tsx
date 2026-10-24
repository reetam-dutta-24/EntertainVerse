"use client";

import { MotionConfig } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import { FeedbackProvider } from "@/components/feedback/feedback-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Framer Motion follows the OS "reduce motion" setting app-wide. */}
      <MotionConfig reducedMotion="user">
        <FeedbackProvider>{children}</FeedbackProvider>
      </MotionConfig>
    </SessionProvider>
  );
}
