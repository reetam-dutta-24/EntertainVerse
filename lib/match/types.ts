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

export interface RoomInvite {
  roomId: string;
  title: string;
  vibe: string;
  topic?: string;
  scope: MatchScope;
  creatorName: string;
  creatorHandle: string;
  creatorAvatarColor: string;
  creatorAvatarUrl?: string;
  /** 0–100 match with the room's creator. */
  matchScore: number;
  /** Why they were invited, e.g. "Both into Death Note · Also in India". */
  reason: string;
  /** The catchy popup line. */
  headline: string;
  joinedCount: number;
  capacity: number;
  expiresAt?: string;
}

export interface RoomMemberView {
  userId: string;
  name: string;
  handle: string;
  avatarColor: string;
  avatarUrl?: string;
  matchScore: number;
  reason: string;
  isMe: boolean;
  isHost: boolean;
}

export interface RoomView {
  id: string;
  title: string;
  vibe: string;
  topic?: string;
  scope: MatchScope;
  /** OPEN: still taking members · FULL: at capacity. */
  status: "OPEN" | "FULL";
  capacity: number;
  invitedCount: number;
  createdByMe: boolean;
  /** The room's private space (chat, posts, watch / voice rooms). */
  communitySlug?: string;
  members: RoomMemberView[];
}
