"use client";

import { AssistantProvider } from "@/components/assistant/assistant-context";
import { AssistantLauncher, AssistantPanel } from "@/components/assistant/assistant-panel";

/** The assistant as an overlay — for full-width layouts (title, song, profile pages) that don't reflow. */
export function AssistantRoot({ userKey, userName }: { userKey: string; userName: string }) {
  return (
    <AssistantProvider userKey={userKey} userName={userName}>
      <AssistantLauncher />
      <AssistantPanel />
    </AssistantProvider>
  );
}
