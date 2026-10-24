import Link from "next/link";
import { getProfilePath } from "@/lib/profile-routes";
import { DmUserAvatar } from "@/components/messages/dm-user-avatar";
import type { UserSummary } from "@/types";
import { DEFAULT_AVATAR_COLOR } from "@/lib/brand-colors";

export interface ProfileFriendsSectionProps {
  title: string;
  friends: UserSummary[];
  emptyMessage?: string;
}

/** Horizontal row of friend profile links. */
export function ProfileFriendsSection({
  title,
  friends,
  emptyMessage = "No friends to show yet.",
}: ProfileFriendsSectionProps) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
      <h2 className="mb-5 text-lg font-bold text-white sm:mb-6 sm:text-heading">
        {title}
      </h2>

      {friends.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/65">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {friends.map((friend) => (
            <Link
              key={friend.id}
              href={getProfilePath(friend.handle ?? friend.id)}
              className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/35 px-3 py-3 shadow-card-inner backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-white/[0.04]"
            >
              <DmUserAvatar
                name={friend.name}
                avatarColor={friend.avatarColor ?? DEFAULT_AVATAR_COLOR}
                avatarUrl={friend.avatarUrl}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white/90">
                  {friend.name}
                </p>
                {friend.handle ? (
                  <p className="truncate text-xs text-white/50">@{friend.handle}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
