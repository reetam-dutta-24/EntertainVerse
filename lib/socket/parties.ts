import type { Server as SocketServer, Socket } from "socket.io";
import { prisma } from "@/lib/prisma";
import { assertCommunityChatMember } from "@/lib/services/community-chat.service";
import { episodeMinutes, fullRuntime, isFilmType } from "@/lib/roadmap/runtime";
import {
  VOICE_ROOM_LIMIT,
  type PartyChatMessage,
  type PartyControl,
  type PartyMedia,
  type PartyMediaMode,
  type PartyMember,
  type PartyState,
  type VoicePeer,
} from "@/lib/party/types";

/**
 * Live parties over Socket.IO (plain Node — loaded by server.ts, so no "server-only"
 * imports). State lives in memory: a party exists while someone is in it.
 *
 *   watch:<channelId>     synced watch party in a community watch channel
 *   listen:<slug>         the community's synced listen party (shared queue)
 *   voice:<channelId>     talk room — WebRTC audio, signalled through here
 *
 * Only members of the community can join. Hosts control playback; anyone can add songs.
 */

const parties = new Map<string, Omit<PartyState, "serverNow"> & { sockets: Map<string, string> }>();
const voiceRooms = new Map<string, Map<string, VoicePeer>>();
const lastChatAt = new Map<string, number>();

const roomOf = (key: string) => `party:${key}`;
const youtubeId = (url?: string | null) => url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1] ?? null;

async function memberProfile(userId: string): Promise<PartyMember> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatarColor: true, avatarUrl: true } });
  return { userId, name: user?.name ?? "Member", avatarColor: user?.avatarColor ?? "#ff00cc", avatarUrl: user?.avatarUrl ?? undefined };
}

/** Turn a catalog item into playable party media (legal sources only). */
async function resolveMedia(item: { kind: "content" | "track"; slug: string }, preferred?: PartyMediaMode): Promise<PartyMedia | null> {
  if (item.kind === "track") {
    const track = await prisma.musicTrack.findUnique({
      where: { slug: item.slug },
      select: { slug: true, title: true, artist: true, imageUrl: true, audioUrl: true, previewUrl: true, durationSeconds: true },
    });
    const src = track?.audioUrl || track?.previewUrl;
    if (!track || !src) return null;
    return {
      kind: "track",
      slug: track.slug,
      title: track.title,
      subtitle: track.audioUrl ? track.artist : `${track.artist} · 30s preview`,
      imageUrl: track.imageUrl ?? undefined,
      mode: "audio",
      src,
      durationSec: track.audioUrl ? (track.durationSeconds ?? undefined) : 30,
      available: ["audio"],
    };
  }
  const content = await prisma.content.findUnique({
    where: { slug: item.slug },
    select: { slug: true, title: true, imageUrl: true, backdropUrl: true, videoUrl: true, trailerUrl: true, type: true, episodeDuration: true, episodeCount: true, seasonCount: true },
  });
  if (!content) return null;
  const trailer = youtubeId(content.trailerUrl);
  const available: PartyMediaMode[] = [...(content.videoUrl ? (["video"] as const) : []), ...(trailer ? (["youtube"] as const) : []), "clock"];
  const mode = preferred && available.includes(preferred) ? preferred : available[0]!;
  const film = isFilmType(content.type);
  return {
    kind: "content",
    slug: content.slug,
    title: content.title,
    subtitle: mode === "youtube" ? "Official trailer" : mode === "clock" ? "Watch on your service — in sync" : film ? "Feature film" : "Episode",
    imageUrl: content.backdropUrl ?? content.imageUrl ?? undefined,
    mode,
    src: mode === "video" ? content.videoUrl! : mode === "youtube" ? trailer! : "",
    // Clock mode runs for one episode (or the film).
    durationSec: mode === "clock" ? (film ? fullRuntime(content) : episodeMinutes(content)) * 60 : undefined,
    available,
  };
}

function snapshot(key: string): PartyState | null {
  const party = parties.get(key);
  if (!party) return null;
  const { sockets: _sockets, ...state } = party;
  void _sockets;
  return { ...state, serverNow: Date.now() };
}

function broadcast(io: SocketServer, key: string) {
  const state = snapshot(key);
  if (state) io.to(roomOf(key)).emit("party:state", state);
}

async function assertMember(userId: string, slug: string) {
  try {
    await assertCommunityChatMember(userId, slug);
  } catch {
    throw new Error("Only members of this room can join its parties.");
  }
}

/** Validate a party key and the user's membership; returns the community slug. */
async function authorize(userId: string, key: string): Promise<{ kind: "watch" | "listen" | "voice"; slug: string; channelId?: string } | null> {
  const [kind, id] = key.split(":");
  if (!id) return null;
  if (kind === "listen") {
    await assertMember(userId, id);
    return { kind, slug: id };
  }
  if (kind === "watch" || kind === "voice") {
    const channel =
      kind === "watch"
        ? await prisma.communityWatchChannel.findUnique({ where: { id }, select: { community: { select: { slug: true } } } })
        : await prisma.communityVoiceChannel.findUnique({ where: { id }, select: { community: { select: { slug: true } } } });
    if (!channel) return null;
    await assertMember(userId, channel.community.slug);
    return { kind, slug: channel.community.slug, channelId: id };
  }
  return null;
}

/** Freeze the clock at the current position (before changing play state). */
function settle(party: Omit<PartyState, "serverNow">) {
  if (party.playing) party.positionSec += (Date.now() - party.updatedAt) / 1000;
  party.updatedAt = Date.now();
}

function leaveParty(io: SocketServer, socket: Socket, key: string) {
  const party = parties.get(key);
  if (!party) return;
  const userId = party.sockets.get(socket.id);
  party.sockets.delete(socket.id);
  void socket.leave(roomOf(key));
  if (userId && ![...party.sockets.values()].includes(userId)) {
    party.members = party.members.filter((member) => member.userId !== userId);
    if (party.hostId === userId) party.hostId = party.members[0]?.userId ?? null;
  }
  if (!party.sockets.size) parties.delete(key);
  else broadcast(io, key);
}

function leaveVoice(io: SocketServer, socket: Socket, key: string) {
  const room = voiceRooms.get(key);
  if (!room?.delete(socket.id)) return;
  void socket.leave(`voice:${key}`);
  io.to(`voice:${key}`).emit("voice:peer-left", { socketId: socket.id });
  if (!room.size) voiceRooms.delete(key);
}

export function registerPartyHandlers(io: SocketServer, socket: Socket, userId: string) {
  const joinedParties = new Set<string>();
  const joinedVoice = new Set<string>();
  const fail = (message: string) => socket.emit("party:error", { message });

  socket.on("party:join", async (payload: unknown) => {
    const key = typeof (payload as { key?: unknown })?.key === "string" ? (payload as { key: string }).key : "";
    try {
      const auth = await authorize(userId, key);
      if (!auth || auth.kind === "voice") return fail("That party doesn't exist.");
      let party = parties.get(key);
      if (!party) {
        // A watch channel may already have a title attached — start with it loaded.
        let media: PartyMedia | null = null;
        if (auth.kind === "watch" && auth.channelId) {
          const channel = await prisma.communityWatchChannel.findUnique({
            where: { id: auth.channelId },
            select: { content: { select: { slug: true } }, track: { select: { slug: true } } },
          });
          if (channel?.content) media = await resolveMedia({ kind: "content", slug: channel.content.slug });
          else if (channel?.track) media = await resolveMedia({ kind: "track", slug: channel.track.slug });
        }
        party = {
          key,
          kind: auth.kind,
          communitySlug: auth.slug,
          hostId: userId,
          members: [],
          media,
          queue: media && auth.kind === "listen" ? [media] : [],
          index: 0,
          playing: false,
          positionSec: 0,
          updatedAt: Date.now(),
          sockets: new Map(),
        };
        parties.set(key, party);
      }
      party.sockets.set(socket.id, userId);
      if (!party.members.some((member) => member.userId === userId)) party.members.push(await memberProfile(userId));
      if (!party.hostId) party.hostId = userId;
      await socket.join(roomOf(key));
      joinedParties.add(key);
      broadcast(io, key);
    } catch (error) {
      fail(error instanceof Error ? error.message : "Couldn't join the party.");
    }
  });

  socket.on("party:leave", (payload: unknown) => {
    const key = String((payload as { key?: unknown })?.key ?? "");
    leaveParty(io, socket, key);
    joinedParties.delete(key);
  });

  socket.on("party:control", async (payload: unknown) => {
    const { key, control } = (payload ?? {}) as { key?: string; control?: PartyControl };
    const party = key ? parties.get(key) : undefined;
    if (!party || !control || party.sockets.get(socket.id) !== userId) return;
    const isHost = party.hostId === userId;
    const hostOnly = !["enqueue"].includes(control.action);
    if (hostOnly && !isHost) return fail("Only the host controls playback.");

    const clamp = (value: unknown) => Math.max(0, Number(value) || 0);
    switch (control.action) {
      case "play":
        party.positionSec = clamp(control.positionSec);
        party.playing = true;
        party.updatedAt = Date.now();
        break;
      case "pause":
        party.positionSec = clamp(control.positionSec);
        party.playing = false;
        party.updatedAt = Date.now();
        break;
      case "seek":
        party.positionSec = clamp(control.positionSec);
        party.updatedAt = Date.now();
        break;
      case "load": {
        const media = await resolveMedia(control.item);
        if (!media) return fail("That title can't be played here.");
        if (party.kind === "listen") {
          party.queue.splice(party.index + 1, 0, media);
          party.index = party.queue.length > 1 ? party.index + 1 : 0;
        }
        party.media = media;
        party.playing = false;
        party.positionSec = 0;
        party.updatedAt = Date.now();
        break;
      }
      case "mode": {
        if (!party.media || party.media.kind !== "content") return;
        const media = await resolveMedia({ kind: "content", slug: party.media.slug }, control.mode);
        if (!media) return;
        party.media = media;
        party.playing = false;
        party.positionSec = 0;
        party.updatedAt = Date.now();
        break;
      }
      case "enqueue": {
        if (party.kind !== "listen") return;
        if (party.queue.length >= 50) return fail("The queue is full.");
        const media = await resolveMedia(control.item);
        if (!media) return fail("That song has no playable audio yet.");
        party.queue.push(media);
        if (!party.media) {
          party.index = party.queue.length - 1;
          party.media = media;
          party.positionSec = 0;
          party.updatedAt = Date.now();
        }
        break;
      }
      case "remove": {
        if (party.kind !== "listen" || control.index === party.index) return;
        party.queue.splice(control.index, 1);
        if (control.index < party.index) party.index -= 1;
        break;
      }
      case "next":
      case "previous":
      case "jump": {
        if (party.kind !== "listen" || !party.queue.length) return;
        const target = control.action === "jump" ? control.index : party.index + (control.action === "next" ? 1 : -1);
        if (target < 0 || target >= party.queue.length) {
          settle(party);
          party.playing = false;
          break;
        }
        party.index = target;
        party.media = party.queue[target]!;
        party.positionSec = 0;
        party.playing = true;
        party.updatedAt = Date.now();
        break;
      }
    }
    broadcast(io, party.key);
  });

  socket.on("party:chat", (payload: unknown) => {
    const { key, text } = (payload ?? {}) as { key?: string; text?: unknown };
    const party = key ? parties.get(key) : undefined;
    const clean = typeof text === "string" ? text.trim().slice(0, 300) : "";
    if (!party || !clean || party.sockets.get(socket.id) !== userId) return;
    const now = Date.now();
    if (now - (lastChatAt.get(socket.id) ?? 0) < 400) return;
    lastChatAt.set(socket.id, now);
    const member = party.members.find((entry) => entry.userId === userId);
    const message: PartyChatMessage = {
      id: `${now}-${socket.id}`,
      userId,
      name: member?.name ?? "Member",
      avatarColor: member?.avatarColor ?? "#ff00cc",
      text: clean,
      at: now,
    };
    io.to(roomOf(party.key)).emit("party:chat", message);
  });

  socket.on("party:reaction", (payload: unknown) => {
    const { key, emoji } = (payload ?? {}) as { key?: string; emoji?: unknown };
    const party = key ? parties.get(key) : undefined;
    if (!party || typeof emoji !== "string" || emoji.length > 8 || party.sockets.get(socket.id) !== userId) return;
    io.to(roomOf(party.key)).emit("party:reaction", { emoji, userId, at: Date.now() });
  });

  // ---- talk rooms (WebRTC signalling) ------------------------------------------------------

  socket.on("voice:join", async (payload: unknown) => {
    const channelId = String((payload as { channelId?: unknown })?.channelId ?? "");
    try {
      const auth = await authorize(userId, `voice:${channelId}`);
      if (!auth) return socket.emit("voice:error", { message: "That talk room doesn't exist." });
      const room = voiceRooms.get(channelId) ?? new Map<string, VoicePeer>();
      if (room.size >= VOICE_ROOM_LIMIT) return socket.emit("voice:error", { message: `Talk rooms hold ${VOICE_ROOM_LIMIT} people — this one is full.` });
      const profile = await memberProfile(userId);
      const me: VoicePeer = { socketId: socket.id, userId, name: profile.name, avatarColor: profile.avatarColor };
      // The newcomer calls everyone already here.
      socket.emit("voice:peers", { peers: [...room.values()] });
      room.set(socket.id, me);
      voiceRooms.set(channelId, room);
      await socket.join(`voice:${channelId}`);
      joinedVoice.add(channelId);
      socket.to(`voice:${channelId}`).emit("voice:peer-joined", me);
    } catch (error) {
      socket.emit("voice:error", { message: error instanceof Error ? error.message : "Couldn't join the talk room." });
    }
  });

  socket.on("voice:signal", (payload: unknown) => {
    const { to, channelId, data } = (payload ?? {}) as { to?: string; channelId?: string; data?: unknown };
    const room = channelId ? voiceRooms.get(channelId) : undefined;
    // Only relay between two people who are both in the same room.
    if (!room || !to || !room.has(socket.id) || !room.has(to)) return;
    io.to(to).emit("voice:signal", { from: socket.id, data });
  });

  socket.on("voice:state", (payload: unknown) => {
    const { channelId, muted, speaking } = (payload ?? {}) as { channelId?: string; muted?: boolean; speaking?: boolean };
    if (!channelId || !voiceRooms.get(channelId)?.has(socket.id)) return;
    socket.to(`voice:${channelId}`).emit("voice:state", { socketId: socket.id, muted: Boolean(muted), speaking: Boolean(speaking) });
  });

  socket.on("voice:leave", (payload: unknown) => {
    const channelId = String((payload as { channelId?: unknown })?.channelId ?? "");
    leaveVoice(io, socket, channelId);
    joinedVoice.delete(channelId);
  });

  socket.on("disconnect", () => {
    for (const key of joinedParties) leaveParty(io, socket, key);
    for (const channelId of joinedVoice) leaveVoice(io, socket, channelId);
    lastChatAt.delete(socket.id);
  });
}
