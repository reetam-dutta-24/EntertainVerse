/** Shared shapes for live parties (socket server + client). Plain TS — no imports. */

/** watch:<channelId> · listen:<communitySlug> */
export type PartyKind = "watch" | "listen";

/**
 * How a watch party plays:
 *  - video: a licensed full video URL an admin added
 *  - youtube: the official trailer (synced embed)
 *  - clock: a shared "watch together" clock — everyone plays the title on their own
 *    streaming service and pauses / resumes together
 *  - audio: a song (listen parties)
 */
export type PartyMediaMode = "video" | "youtube" | "clock" | "audio";

export interface PartyMedia {
  kind: "content" | "track";
  slug: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  mode: PartyMediaMode;
  /** URL (video / audio) or YouTube id. Empty for clock mode. */
  src: string;
  /** Known length in seconds (clock mode uses it as the episode / film length). */
  durationSec?: number;
  /** Modes this title supports, so the host can switch. */
  available: PartyMediaMode[];
}

export interface PartyMember {
  userId: string;
  name: string;
  avatarColor: string;
  avatarUrl?: string;
}

export interface PartyState {
  key: string;
  kind: PartyKind;
  communitySlug: string;
  hostId: string | null;
  members: PartyMember[];
  media: PartyMedia | null;
  /** Listen parties: the shared queue; `index` is now playing. */
  queue: PartyMedia[];
  index: number;
  playing: boolean;
  /** Position when `updatedAt` was stamped; add elapsed time while playing. */
  positionSec: number;
  /** Server epoch ms. */
  updatedAt: number;
  /** Server epoch ms when this state was sent — lets clients correct clock skew. */
  serverNow: number;
  /** The host is broadcasting their screen or camera to the room (watch parties). */
  live: PartyLive | null;
}

export type PartyLiveKind = "screen" | "camera";

export interface PartyLive {
  userId: string;
  kind: PartyLiveKind;
  /** Server epoch ms — a new broadcast gets a new value, so viewers know to reconnect. */
  startedAt: number;
}

export interface PartyChatMessage {
  id: string;
  userId: string;
  name: string;
  avatarColor: string;
  text: string;
  at: number;
}

export type PartyControl =
  | { action: "play"; positionSec: number }
  | { action: "pause"; positionSec: number }
  | { action: "seek"; positionSec: number }
  | { action: "load"; item: { kind: "content" | "track"; slug: string } }
  | { action: "mode"; mode: PartyMediaMode }
  | { action: "enqueue"; item: { kind: "track"; slug: string } }
  | { action: "remove"; index: number }
  | { action: "next" }
  | { action: "previous" }
  | { action: "jump"; index: number };

export interface VoicePeer {
  socketId: string;
  userId: string;
  name: string;
  avatarColor: string;
}

/** Where a party's playback should be right now. */
export function expectedPosition(state: Pick<PartyState, "playing" | "positionSec" | "updatedAt">, skewMs = 0) {
  if (!state.playing) return state.positionSec;
  return state.positionSec + Math.max(0, Date.now() + skewMs - state.updatedAt) / 1000;
}

export const VOICE_ROOM_LIMIT = 8;

/** Live hosting is browser-to-browser: the host uploads one stream per viewer. */
export const LIVE_VIEWER_LIMIT = 8;
