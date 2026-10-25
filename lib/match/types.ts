/** Client-safe shapes for AI Match (taste circles). */

export type MatchScope = "nearby" | "country" | "world";

export const MATCH_SCOPES: { id: MatchScope; label: string; emoji: string; hint: string }[] = [
  { id: "nearby", label: "Nearby", emoji: "📍", hint: "Within about 50 km — needs your approximate location" },
  { id: "country", label: "My country", emoji: "🗺️", hint: "Anyone in the same country" },
  { id: "world", label: "Worldwide", emoji: "🌍", hint: "The best taste matches anywhere" },
];

export interface MatchProfileView {
  enabled: boolean;
  scope: MatchScope;
  hasLocation: boolean;
  country: string | null;
  intro: string;
  groupSize: number;
}

export interface MatchPerson {
  userId: string;
  name: string;
  handle: string;
  avatarColor: string;
  avatarUrl?: string;
  intro?: string;
  /** 0–100 taste match. */
  matchScore: number;
  reasons: string[];
  /** "~12 km away", "Also in India", "Across the world". */
  distanceLabel: string;
}

export interface CircleProposal {
  title: string;
  vibe: string;
  members: MatchPerson[];
}

export interface CircleMemberView {
  userId: string;
  name: string;
  handle: string;
  avatarColor: string;
  avatarUrl?: string;
  status: "INVITED" | "ACCEPTED" | "DECLINED" | "LEFT";
  matchScore: number;
  reason: string;
  isMe: boolean;
}

export interface CircleView {
  id: string;
  title: string;
  vibe: string;
  status: "FORMING" | "ACTIVE";
  myStatus: CircleMemberView["status"];
  createdByMe: boolean;
  /** Private community space (chat, posts, rooms) once active. */
  communitySlug?: string;
  members: CircleMemberView[];
}
