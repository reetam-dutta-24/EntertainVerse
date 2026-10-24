"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { DmUserAvatar } from "@/components/messages/dm-user-avatar";

interface InviteFriend {
  id: string;
  name: string;
  handle: string;
  avatarColor: string;
  avatarUrl?: string;
}

export interface CommunityFriendInvitePanelProps {
  communitySlug: string;
}

export function CommunityFriendInvitePanel({
  communitySlug,
}: CommunityFriendInvitePanelProps) {
  const router = useRouter();
  const [friends, setFriends] = useState<InviteFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();

  // `loading` starts true; this only runs on mount / when the community changes.
  const loadFriends = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}/invite-friends`,
        { credentials: "include" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not load friends.",
        );
      }
      setFriends(Array.isArray(data.friends) ? data.friends : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load friends.",
      );
    } finally {
      setLoading(false);
    }
  }, [communitySlug]);

  useEffect(() => {
    // State updates in loadFriends all happen after its first await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFriends();
  }, [loadFriends]);

  async function handleAdd(friend: InviteFriend) {
    setBusyId(friend.id);
    setError(undefined);
    setStatus(undefined);
    try {
      const response = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: friend.id }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not add member.",
        );
      }
      setFriends((current) => current.filter((entry) => entry.id !== friend.id));
      setStatus(`${friend.name} was added to the community.`);
      router.refresh();
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Could not add member.",
      );
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-white/70">
        Add mutual friends directly to this private community. They skip the room code step.
      </p>
      {loading ? (
        <p className="text-sm text-white/55">Loading your friends…</p>
      ) : friends.length === 0 ? (
        <p className="rounded-[14px] border border-white/10 bg-black/30 px-4 py-6 text-center text-sm text-white/55">
          No friends available to invite — they may already be members.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {friends.map((friend) => (
            <li
              key={friend.id}
              className="flex items-center gap-3 rounded-[14px] border border-white/[0.08] bg-black/35 px-3 py-2.5"
            >
              <DmUserAvatar
                name={friend.name}
                avatarColor={friend.avatarColor}
                avatarUrl={friend.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{friend.name}</p>
                <p className="truncate text-[11px] text-white/55">@{friend.handle}</p>
              </div>
              <button
                type="button"
                disabled={busyId === friend.id}
                onClick={() => void handleAdd(friend)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-brand-magenta bg-brand-magenta/15 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-magenta/25 disabled:opacity-50"
              >
                <UserPlus className="size-3.5" />
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
      {status ? <p className="text-xs font-medium text-emerald-400">{status}</p> : null}
      {error ? <p className="text-xs font-medium text-red-400">{error}</p> : null}
    </div>
  );
}
