import type { Metadata } from "next";
import { MatchExperience } from "@/components/ai-mode/match-experience";
import { getCurrentUser } from "@/lib/data/user";
import { getMatchProfile, listMyRooms, listRoomInvites, suggestRoom } from "@/lib/services/match.service";

export const metadata: Metadata = {
  title: "AI Match rooms — AniVerse",
  description: "Open a room and everyone who shares your taste gets invited — watch parties, listen parties, talk rooms and chat.",
};

export default async function AiMatchPage() {
  const user = await getCurrentUser();
  const [profile, rooms, invites, suggestion] = await Promise.all([
    getMatchProfile(user.id),
    listMyRooms(user.id),
    listRoomInvites(user.id),
    suggestRoom(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <MatchExperience initialProfile={profile} initialRooms={rooms} initialInvites={invites} suggestion={suggestion} />
    </div>
  );
}
