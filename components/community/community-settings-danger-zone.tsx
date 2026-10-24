"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import type { MemberRole } from "@/types";

export interface CommunitySettingsDangerZoneProps {
  communitySlug: string;
  communityName: string;
  viewerRole?: MemberRole;
  canDelete?: boolean;
}

export function CommunitySettingsDangerZone({
  communitySlug,
  communityName,
  viewerRole,
  canDelete = false,
}: CommunitySettingsDangerZoneProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"leave" | "delete" | null>(null);
  const [error, setError] = useState<string>();

  const canLeave =
    viewerRole === "member" ||
    viewerRole === "moderator" ||
    viewerRole === "admin";

  async function handleLeave() {
    if (
      !window.confirm(
        `Leave ${communityName}? You will need a room code or a new invite to rejoin.`,
      )
    ) {
      return;
    }
    setBusy("leave");
    setError(undefined);
    try {
      const response = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}/join`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not leave community.",
        );
      }
      router.push("/dashboard/community");
      router.refresh();
    } catch (leaveError) {
      setError(
        leaveError instanceof Error
          ? leaveError.message
          : "Could not leave community.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete ${communityName} permanently? This removes all posts, channels, and members.`,
      )
    ) {
      return;
    }
    setBusy("delete");
    setError(undefined);
    try {
      const response = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not delete community.",
        );
      }
      router.push("/dashboard/community");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete community.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!canLeave && !canDelete) return null;

  return (
    <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/5 p-4">
      <h3 className="text-sm font-bold text-red-300">Danger zone</h3>
      <p className="mt-1 text-xs text-white/55">
        Leave this community or permanently delete it. These actions cannot be undone.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canLeave && !canDelete ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void handleLeave()}
            className="flex items-center justify-center gap-2 rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            <LogOut className="size-3.5" />
            {busy === "leave" ? "Leaving…" : "Leave Community"}
          </button>
        ) : null}
        {canLeave && canDelete ? (
          <>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void handleLeave()}
              className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50"
            >
              <LogOut className="size-3.5" />
              {busy === "leave" ? "Leaving…" : "Leave Community"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void handleDelete()}
              className="flex items-center justify-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              {busy === "delete" ? "Deleting…" : "Delete Community"}
            </button>
          </>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
