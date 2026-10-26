import type { Server as SocketServer, Socket } from "socket.io";
import { prisma } from "@/lib/prisma";
import { assertCommunityChatMember } from "@/lib/services/community-chat.service";
import { getSharedStore } from "@/lib/socket/shared-store";
import { episodeMinutes, fullRuntime, isFilmType } from "@/lib/roadmap/runtime";
import {
  LIVE_VIEWER_LIMIT,
  VOICE_ROOM_LIMIT,
  type PartyChatMessage,
  type PartyLiveKind,
  type PartyControl,
  type PartyMedia,
  type PartyMediaMode,
  type PartyMember,
  type PartyState,
  type VoicePeer,
} from "@/lib/party/types";

/**
 * Live parties over Socket.IO (plain Node — loaded by server.ts, so no "server-only"
 * imports). A party exists while someone is in it.
 *
 *   watch:<channelId>     synced watch party in a community watch channel
 *   listen:<slug>         the community's synced listen party (shared queue)
 *   voice:<channelId>     talk room — WebRTC audio, signalled through here
 *
 * Watch-party hosts can also go live: their screen or camera goes browser-to-browser to
 * each viewer (one connection per viewer), with the offers/answers relayed here.
 *
 * Only members of the community can join. Hosts control playback; anyone can add songs.
 *
 * State lives in the shared store (Redis when several app servers run, memory otherwise),
 * so two people in one party see the same host, members and playback whichever server
 * they're connected to. Every change is a locked read-modify-write.
 */

/** A party as stored — plain JSON, so it can live in Redis. */
type StoredParty = Omit<PartyState, "serverNow"> & {
  /** socketId → userId for every socket in the party, on every server. */
  sockets: Record<string, string>;
  /** The broadcasting socket while the host is live. */
  liveSocketId?: string;
  /** Sockets currently receiving the broadcast. */
  liveViewers: string[];
};

/** socketId → peer for everyone in a talk room. */
type StoredVoiceRoom = Record<string, VoicePeer>;

/** Per-socket chat throttle — a socket lives on one server, so memory is enough here. */
const lastChatAt = new Map<string, number>();

const roomOf = (key: string) => `party:${key}`;
const voiceRoomOf = (channelId: string) => `voice:${channelId}`;
const partyKey = (key: string) => `party:${key}`;
const voiceKey = (channelId: string) => `voice:${channelId}`;
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

function snapshot(party: StoredParty): PartyState {
  const { sockets: _sockets, liveSocketId: _liveSocketId, liveViewers: _liveViewers, ...state } = party;
  void _sockets;
  void _liveSocketId;
  void _liveViewers;
  return { ...state, serverNow: Date.now() };
}

function broadcast(io: SocketServer, party: StoredParty) {
  io.to(roomOf(party.key)).emit("party:state", snapshot(party));
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

/** End the host's broadcast for everyone. */
function endLive(io: SocketServer, party: StoredParty) {
  if (!party.live) return;
  party.live = null;
  party.liveSocketId = undefined;
  party.liveViewers = [];
  io.to(roomOf(party.key)).emit("live:ended", { key: party.key });
}

/** Remove one socket from a party (it left, disconnected, or its server is gone). */
function dropSocket(io: SocketServer, party: StoredParty, socketId: string) {
  const userId = party.sockets[socketId];
  delete party.sockets[socketId];
  if (party.liveSocketId === socketId) endLive(io, party);
  else if (party.liveViewers.includes(socketId)) {
    party.liveViewers = party.liveViewers.filter((id) => id !== socketId);
    if (party.liveSocketId) io.to(party.liveSocketId).emit("live:viewer-left", { viewerSocketId: socketId });
  }
  // A user stays in the party while any of their tabs is still in it.
  if (userId && !Object.values(party.sockets).includes(userId)) {
    party.members = party.members.filter((member) => member.userId !== userId);
    if (party.hostId === userId) party.hostId = party.members[0]?.userId ?? null;
  }
}

/**
 * Stored sockets that are no longer connected anywhere — e.g. their server crashed, so
 * their own leave never ran. Asks every server (through the Redis adapter) who is in the
 * room. Only ids stored before asking are candidates, and a socket joins the room before
 * it's stored, so someone joining at this very moment is never mistaken for a ghost.
 */
async function ghostSockets(io: SocketServer, room: string, stored: string[]): Promise<string[]> {
  if (!stored.length) return [];
  const connected = new Set((await io.in(room).fetchSockets()).map((socket) => socket.id));
  return stored.filter((id) => !connected.has(id));
}

async function leaveParty(io: SocketServer, socket: Socket, key: string) {
  const store = await getSharedStore();
  const party = await store.update<StoredParty>(partyKey(key), (party) => {
    if (!party || !(socket.id in party.sockets)) return undefined;
    dropSocket(io, party, socket.id);
    return Object.keys(party.sockets).length ? party : null;
  });
  void socket.leave(roomOf(key));
  if (party) broadcast(io, party);
}

async function leaveVoice(io: SocketServer, socket: Socket, channelId: string) {
  const store = await getSharedStore();
  let left = false;
  await store.update<StoredVoiceRoom>(voiceKey(channelId), (room) => {
    if (!room?.[socket.id]) return undefined;
    delete room[socket.id];
    left = true;
    return Object.keys(room).length ? room : null;
  });
  void socket.leave(voiceRoomOf(channelId));
  if (left) io.to(voiceRoomOf(channelId)).emit("voice:peer-left", { socketId: socket.id });
}

export function registerPartyHandlers(io: SocketServer, socket: Socket, userId: string) {
  const joinedParties = new Set<string>();
  const joinedVoice = new Set<string>();
  const fail = (message: string) => socket.emit("party:error", { message });
  const isMember = (party: StoredParty | null): party is StoredParty => party?.sockets[socket.id] === userId;

  socket.on("party:join", async (payload: unknown) => {
    const key = typeof (payload as { key?: unknown })?.key === "string" ? (payload as { key: string }).key : "";
    try {
      const auth = await authorize(userId, key);
      if (!auth || auth.kind === "voice") return fail("That party doesn't exist.");
      const kind = auth.kind;
      const store = await getSharedStore();
      const existing = await store.get<StoredParty>(partyKey(key));

      // Database lookups happen before taking the lock, so other servers wait less.
      let media: PartyMedia | null = null;
      if (!existing && kind === "watch" && auth.channelId) {
        // A watch channel may already have a title attached — start with it loaded.
        const channel = await prisma.communityWatchChannel.findUnique({
          where: { id: auth.channelId },
          select: { content: { select: { slug: true } }, track: { select: { slug: true } } },
        });
        if (channel?.content) media = await resolveMedia({ kind: "content", slug: channel.content.slug });
        else if (channel?.track) media = await resolveMedia({ kind: "track", slug: channel.track.slug });
      }
      const profile = await memberProfile(userId);
      const ghosts = await ghostSockets(io, roomOf(key), Object.keys(existing?.sockets ?? {}));

      // Join the Socket.IO room before being stored (see ghostSockets).
      await socket.join(roomOf(key));
      joinedParties.add(key);

      const party = await store.update<StoredParty>(partyKey(key), (party) => {
        party ??= {
          key,
          kind,
          communitySlug: auth.slug,
          hostId: userId,
          members: [],
          media,
          queue: media && kind === "listen" ? [media] : [],
          index: 0,
          playing: false,
          positionSec: 0,
          updatedAt: Date.now(),
          live: null,
          sockets: {},
          liveViewers: [],
        };
        for (const ghost of ghosts) if (ghost in party.sockets) dropSocket(io, party, ghost);
        party.sockets[socket.id] = userId;
        if (!party.members.some((member) => member.userId === userId)) party.members.push(profile);
        if (!party.hostId) party.hostId = userId;
        return party;
      });
      if (party) broadcast(io, party);
    } catch (error) {
      fail(error instanceof Error ? error.message : "Couldn't join the party.");
    }
  });

  socket.on("party:leave", async (payload: unknown) => {
    const key = String((payload as { key?: unknown })?.key ?? "");
    joinedParties.delete(key);
    await leaveParty(io, socket, key);
  });

  socket.on("party:control", async (payload: unknown) => {
    const { key, control } = (payload ?? {}) as { key?: string; control?: PartyControl };
    if (!key || !control) return;
    const store = await getSharedStore();
    const clamp = (value: unknown) => Math.max(0, Number(value) || 0);

    const party = await store.update<StoredParty>(partyKey(key), async (party) => {
      if (!isMember(party)) return undefined;
      const isHost = party.hostId === userId;
      const hostOnly = !["enqueue"].includes(control.action);
      if (hostOnly && !isHost) {
        fail("Only the host controls playback.");
        return undefined;
      }

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
          if (!media) {
            fail("That title can't be played here.");
            return undefined;
          }
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
          if (!party.media || party.media.kind !== "content") return undefined;
          const media = await resolveMedia({ kind: "content", slug: party.media.slug }, control.mode);
          if (!media) return undefined;
          party.media = media;
          party.playing = false;
          party.positionSec = 0;
          party.updatedAt = Date.now();
          break;
        }
        case "enqueue": {
          if (party.kind !== "listen") return undefined;
          if (party.queue.length >= 50) {
            fail("The queue is full.");
            return undefined;
          }
          const media = await resolveMedia(control.item);
          if (!media) {
            fail("That song has no playable audio yet.");
            return undefined;
          }
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
          if (party.kind !== "listen" || control.index === party.index) return undefined;
          party.queue.splice(control.index, 1);
          if (control.index < party.index) party.index -= 1;
          break;
        }
        case "next":
        case "previous":
        case "jump": {
          if (party.kind !== "listen" || !party.queue.length) return undefined;
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
      return party;
    });
    if (party) broadcast(io, party);
  });

  socket.on("party:chat", async (payload: unknown) => {
    const { key, text } = (payload ?? {}) as { key?: string; text?: unknown };
    const clean = typeof text === "string" ? text.trim().slice(0, 300) : "";
    if (!key || !clean) return;
    // Throttle first — it's per socket, and a socket lives on one server, so memory is fine.
    const now = Date.now();
    if (now - (lastChatAt.get(socket.id) ?? 0) < 400) return;
    const party = await (await getSharedStore()).get<StoredParty>(partyKey(key));
    if (!isMember(party)) return;
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
    // Membership was checked when this socket joined; no store read per emoji.
    if (!key || !joinedParties.has(key) || typeof emoji !== "string" || emoji.length > 8) return;
    io.to(roomOf(key)).emit("party:reaction", { emoji, userId, at: Date.now() });
  });

  // ---- live hosting (watch parties: host screen / camera → viewers) ------------------------

  /** Locked change to a party this socket is in; `change` returns whether it changed anything. */
  const changeMemberParty = async (key: unknown, change: (party: StoredParty) => boolean) => {
    if (typeof key !== "string") return null;
    const store = await getSharedStore();
    return store.update<StoredParty>(partyKey(key), (party) => (isMember(party) && change(party) ? party : undefined));
  };

  socket.on("live:start", async (payload: unknown) => {
    const { key, kind } = (payload ?? {}) as { key?: unknown; kind?: unknown };
    const party = await changeMemberParty(key, (party) => {
      if (party.kind !== "watch") return false;
      if (party.hostId !== userId) {
        fail("Only the host can go live.");
        return false;
      }
      if (kind !== "screen" && kind !== "camera") return false;
      if (party.live) endLive(io, party);
      party.live = { userId, kind: kind as PartyLiveKind, startedAt: Date.now() };
      party.liveSocketId = socket.id;
      return true;
    });
    if (party) broadcast(io, party);
  });

  socket.on("live:stop", async (payload: unknown) => {
    const party = await changeMemberParty((payload as { key?: unknown })?.key, (party) => {
      if (!party.live || (party.liveSocketId !== socket.id && party.hostId !== userId)) return false;
      endLive(io, party);
      return true;
    });
    if (party) broadcast(io, party);
  });

  // A viewer asks for the stream; the broadcaster then sends them an offer.
  socket.on("live:request", async (payload: unknown) => {
    let broadcaster: string | undefined;
    await changeMemberParty((payload as { key?: unknown })?.key, (party) => {
      if (!party.live || !party.liveSocketId || party.liveSocketId === socket.id) return false;
      if (!party.liveViewers.includes(socket.id)) {
        if (party.liveViewers.length >= LIVE_VIEWER_LIMIT) {
          fail(`Live streams hold ${LIVE_VIEWER_LIMIT} viewers — this one is full.`);
          return false;
        }
        party.liveViewers.push(socket.id);
      }
      broadcaster = party.liveSocketId;
      return true;
    });
    // A socket id is also a room, so this reaches the broadcaster on whichever server they're on.
    if (broadcaster) io.to(broadcaster).emit("live:viewer", { viewerSocketId: socket.id });
  });

  // Offers / answers / ICE candidates — only between the broadcaster and that party's members.
  socket.on("live:signal", async (payload: unknown) => {
    const { key, to, data } = (payload ?? {}) as { key?: unknown; to?: unknown; data?: unknown };
    if (typeof key !== "string" || typeof to !== "string") return;
    const party = await (await getSharedStore()).get<StoredParty>(partyKey(key));
    if (!isMember(party) || !party.liveSocketId) return;
    const fromBroadcaster = socket.id === party.liveSocketId;
    const allowed = fromBroadcaster ? to in party.sockets : to === party.liveSocketId && party.liveViewers.includes(socket.id);
    if (allowed) io.to(to).emit("live:signal", { from: socket.id, data });
  });

  // ---- talk rooms (WebRTC signalling) ------------------------------------------------------

  socket.on("voice:join", async (payload: unknown) => {
    const channelId = String((payload as { channelId?: unknown })?.channelId ?? "");
    try {
      const auth = await authorize(userId, `voice:${channelId}`);
      if (!auth) return socket.emit("voice:error", { message: "That talk room doesn't exist." });
      const store = await getSharedStore();
      const profile = await memberProfile(userId);
      const me: VoicePeer = { socketId: socket.id, userId, name: profile.name, avatarColor: profile.avatarColor };
      const stored = Object.keys((await store.get<StoredVoiceRoom>(voiceKey(channelId))) ?? {});
      const ghosts = await ghostSockets(io, voiceRoomOf(channelId), stored);

      // Join the Socket.IO room before being stored (see ghostSockets); undone if it's full.
      await socket.join(voiceRoomOf(channelId));
      let peers: VoicePeer[] | null = null;
      await store.update<StoredVoiceRoom>(voiceKey(channelId), (room) => {
        room ??= {};
        for (const ghost of ghosts) {
          if (!room[ghost]) continue;
          delete room[ghost];
          io.to(voiceRoomOf(channelId)).emit("voice:peer-left", { socketId: ghost });
        }
        if (Object.keys(room).length >= VOICE_ROOM_LIMIT) return undefined;
        peers = Object.values(room);
        room[socket.id] = me;
        return room;
      });
      if (!peers) {
        void socket.leave(voiceRoomOf(channelId));
        return socket.emit("voice:error", { message: `Talk rooms hold ${VOICE_ROOM_LIMIT} people — this one is full.` });
      }
      joinedVoice.add(channelId);
      // The newcomer calls everyone already here.
      socket.emit("voice:peers", { peers });
      socket.to(voiceRoomOf(channelId)).emit("voice:peer-joined", me);
    } catch (error) {
      socket.emit("voice:error", { message: error instanceof Error ? error.message : "Couldn't join the talk room." });
    }
  });

  socket.on("voice:signal", async (payload: unknown) => {
    const { to, channelId, data } = (payload ?? {}) as { to?: string; channelId?: string; data?: unknown };
    if (!to || !channelId || !joinedVoice.has(channelId)) return;
    const room = await (await getSharedStore()).get<StoredVoiceRoom>(voiceKey(channelId));
    // Only relay between two people who are both in the same room.
    if (!room?.[socket.id] || !room[to]) return;
    io.to(to).emit("voice:signal", { from: socket.id, data });
  });

  socket.on("voice:state", (payload: unknown) => {
    const { channelId, muted, speaking } = (payload ?? {}) as { channelId?: string; muted?: boolean; speaking?: boolean };
    // Sent often (speaking on/off); membership was checked on join, so no store read here.
    if (!channelId || !joinedVoice.has(channelId)) return;
    socket.to(voiceRoomOf(channelId)).emit("voice:state", { socketId: socket.id, muted: Boolean(muted), speaking: Boolean(speaking) });
  });

  socket.on("voice:leave", async (payload: unknown) => {
    const channelId = String((payload as { channelId?: unknown })?.channelId ?? "");
    joinedVoice.delete(channelId);
    await leaveVoice(io, socket, channelId);
  });

  socket.on("disconnect", async () => {
    lastChatAt.delete(socket.id);
    await Promise.all([
      ...[...joinedParties].map((key) => leaveParty(io, socket, key)),
      ...[...joinedVoice].map((channelId) => leaveVoice(io, socket, channelId)),
    ]).catch((error) => console.error("[parties] cleanup on disconnect failed", error));
  });
}
