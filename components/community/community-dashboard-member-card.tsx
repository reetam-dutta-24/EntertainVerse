"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Shield, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DmUserAvatar } from "@/components/messages/dm-user-avatar";
import type { Member, MemberRole } from "@/types";
import { DEFAULT_AVATAR_COLOR } from "@/lib/brand-colors";
import { useConfirm } from "@/components/feedback/feedback-provider";

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Admin",
  admin: "Admin",
  moderator: "Moderator",
  member: "Member",
};

export interface CommunityDashboardMemberCardProps {
  member: Member;
  communitySlug?: string;
  canManage?: boolean;
  className?: string;
}

export function CommunityDashboardMemberCard({
  member,
  communitySlug,
  canManage = false,
  className,
}: CommunityDashboardMemberCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const confirmAction = useConfirm();
  const [error, setError] = useState<string>();

  async function updateRole(nextRole: "moderator" | "member") {
    if (!communitySlug) return;
    setBusy(`role-${nextRole}`);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}/members/${encodeURIComponent(member.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ role: nextRole }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not update role.",
        );
      }
      router.refresh();
    } catch (roleError) {
      setError(
        roleError instanceof Error ? roleError.message : "Could not update role.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeMember() {
    if (!communitySlug) return;
    const confirmed = await confirmAction({
      title: `Remove ${member.name}?`,
      description: "They lose access to the community chat, channels and posts. They can rejoin with an invite or room code.",
      confirmLabel: "Remove member",
      destructive: true,
    });
    if (!confirmed) return;
    setBusy("remove");
    setError(undefined);
    try {
      const response = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}/members/${encodeURIComponent(member.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not remove member.",
        );
      }
      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove member.",
      );
    } finally {
      setBusy(null);
    }
  }

  const showActions =
    canManage && member.role !== "admin" && member.role !== "owner";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-black/35 px-3 py-2.5 shadow-card-inner backdrop-blur-sm",
        )}
      >
        <div className="relative shrink-0">
          <DmUserAvatar
            name={member.name}
            avatarColor={member.avatarColor ?? DEFAULT_AVATAR_COLOR}
            avatarUrl={member.avatarUrl}
            size="sm"
            profileHandle={member.handle ?? member.id}
          />
          {member.online ? (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-emerald-500/70"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/85">{member.name}</p>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-caption font-medium text-white/50">
              {ROLE_LABELS[member.role]}
            </span>
            {member.handle ? (
              <span className="text-caption text-white/60">@{member.handle}</span>
            ) : null}
            {member.online ? (
              <span className="text-caption italic text-emerald-400/60">Online</span>
            ) : null}
          </div>
        </div>

        {showActions ? (
          <div className="flex shrink-0 flex-col gap-1">
            {member.role === "member" ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void updateRole("moderator")}
                title="Make moderator"
                className="rounded-lg p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
              >
                <Shield className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void updateRole("member")}
                title="Remove moderator role"
                className="rounded-lg p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
              >
                <Crown className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void removeMember()}
              title="Remove member"
              className="rounded-lg p-1 text-red-300/70 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <UserMinus className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      {error ? <p className="px-1 text-caption text-red-400">{error}</p> : null}
    </div>
  );
}
