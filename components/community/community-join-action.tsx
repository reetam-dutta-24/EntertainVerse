"use client";

import { useAppRouter } from "@/hooks/use-app-router";
import { useState } from "react";
import { detailHeroBtnBase } from "@/lib/detail-route-ui";

interface CommunityJoinActionProps {
  communitySlug: string;
  isMember: boolean;
}

export function CommunityJoinAction({
  communitySlug,
  isMember,
}: CommunityJoinActionProps) {
  const router = useAppRouter();
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (loading || isMember) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}/join`,
        { method: "POST" },
      );
      if (response.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (isMember) {
    return (
      <button
        type="button"
        disabled
        className={detailHeroBtnBase(
          "mx-auto border border-white/20 bg-white/10 font-bold text-white/80",
        )}
      >
        Joined
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleJoin}
      className={detailHeroBtnBase(
        "mx-auto border-transparent bg-gradient-to-r from-red-600 to-rose-600 font-bold text-white",
      )}
    >
      {loading ? "Joining…" : "Join community"}
    </button>
  );
}
