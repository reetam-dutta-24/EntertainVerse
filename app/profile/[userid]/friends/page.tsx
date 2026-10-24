import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfilePath } from "@/lib/profile-routes";
import { getOptionalUser } from "@/lib/data/user";
import { getUserDetail } from "@/lib/data/user-detail";
import { listUserFriends } from "@/lib/services/follow.service";
import { normalizeProfileSlug } from "@/lib/profile-routes";
import { prisma } from "@/lib/prisma";
import { mapUserSummary } from "@/lib/mappers/community.mapper";

export const dynamic = "force-dynamic";

interface FriendsPageProps {
  params: Promise<{ userid: string }>;
}

export async function generateMetadata({
  params,
}: FriendsPageProps): Promise<Metadata> {
  const { userid } = await params;
  const profile = await getUserDetail(userid);
  if (!profile) return { title: "Friends — AniVerse" };
  return {
    title: `${profile.name}'s Friends — AniVerse`,
    description: `Friends of ${profile.name} on AniVerse`,
  };
}

export default async function ProfileFriendsPage({ params }: FriendsPageProps) {
  const { userid } = await params;
  const viewer = await getOptionalUser();
  const profile = await getUserDetail(userid, viewer?.id);
  if (!profile) notFound();

  const user = await prisma.user.findFirst({
    where: { handle: normalizeProfileSlug(userid) },
    select: { id: true },
  });
  if (!user) notFound();

  const friends = (await listUserFriends(user.id)).map(mapUserSummary);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-8">
      <div className="mb-8">
        <Link
          href={getProfilePath(profile.handle)}
          className="text-sm text-brand-pink hover:underline"
        >
          ← Back to {profile.name}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">
          {profile.name}&apos;s Friends
        </h1>
        <p className="mt-1 text-sm text-white/70">
          {friends.length} {friends.length === 1 ? "friend" : "friends"}
        </p>
      </div>

      {friends.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center text-sm text-white/70">
          No friends yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {friends.map((friend) => (
            <li key={friend.id}>
              <Link
                href={getProfilePath(friend.handle ?? friend.id)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-black"
                  style={{ backgroundColor: friend.avatarColor }}
                >
                  {friend.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={friend.avatarUrl}
                      alt=""
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    friend.name.charAt(0).toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {friend.name}
                  </p>
                  {friend.handle ? (
                    <p className="truncate text-xs text-white/55">
                      @{friend.handle}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
