"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/forms/form-shell";

interface CommunityJoinCodePanelProps {
  communitySlug: string;
  visibility: "public" | "private";
  canManage?: boolean;
}

export function CommunityJoinCodePanel({
  communitySlug,
  visibility,
  canManage = false,
}: CommunityJoinCodePanelProps) {
  const [hasJoinCode, setHasJoinCode] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canManage || visibility !== "private") return;

    void fetch(`/api/communities/${encodeURIComponent(communitySlug)}/join-code`)
      .then((response) => response.json())
      .then((data) => {
        setHasJoinCode(Boolean(data.hasJoinCode));
      })
      .catch(() => undefined);
  }, [canManage, communitySlug, visibility]);

  async function handleRegenerate() {
    setLoading(true);
    setError(undefined);
    setIssuedCode(undefined);

    const response = await fetch(
      `/api/communities/${encodeURIComponent(communitySlug)}/join-code`,
      { method: "POST" },
    );
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not regenerate room code.");
      return;
    }

    setIssuedCode(data.joinCode);
    setHasJoinCode(true);
  }

  if (visibility !== "private") return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Private room access</h3>
          <p className="mt-1 text-xs text-white/65">
            Share an encrypted room code so only invited members can join.
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void handleRegenerate()}
            className="shrink-0 rounded-full border-brand-magenta/70 text-xs"
          >
            <RefreshCw className="me-1 size-3.5" />
            {hasJoinCode ? "New Code" : "Generate code"}
          </Button>
        ) : null}
      </div>

      {issuedCode ? (
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5">
          <p className="text-micro font-semibold uppercase tracking-wide text-emerald-300">
            New room code — copy now
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-white">{issuedCode}</p>
          <p className="mt-1 text-caption text-white/60">
            This code is shown once. Share it only with people you want to invite.
          </p>
        </div>
      ) : hasJoinCode ? (
        <p className="mt-3 text-xs text-white/60">
          A room code is active. Regenerate to issue a new encrypted key.
        </p>
      ) : null}

      <FormError message={error} />
    </div>
  );
}
