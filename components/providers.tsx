"use client";

import { MotionConfig } from "framer-motion";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Framer Motion follows the OS "reduce motion" setting app-wide. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SessionProvider>
  );
}
