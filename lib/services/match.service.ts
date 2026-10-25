import "server-only";

import { prisma } from "@/lib/prisma";
import { VOCAB, WATCH_THEMES, WATCH_VIBES } from "@/lib/ai-profile/vocabulary";
import { centroid, dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import { createNotification } from "@/lib/services/notification.service";
import { loadTasteCatalog, loadTasteSignals, tasteCentroids, type TasteSignals } from "@/lib/services/taste-engine.service";
import type { MatchProfileView, MatchScope, RoomInvite, RoomView } from "@/lib/match/types";

/**
 * AI Match rooms: a user opens a room; everyone opted in within its reach whose taste
 * and personality match theirs gets a popup and a notification, and joins in one tap.
 * Only opted-in users are ever matched; location is coarse (~10 km) and only turned
 * into a rough distance label, never shown.
 */

const NEARBY_KM = 50;
const MIN_GROUP = 3;
const MAX_GROUP = 6;

// ---- profile -----------------------------------------------------------------------------

/** ~10 km precision: one decimal place of latitude / longitude. */
const coarse = (value: number) => Math.round(value * 10) / 10;

export async function getMatchProfile(userId: string): Promise<MatchProfileView | null> {
  const row = await prisma.matchProfile.findUnique({ where: { userId } });
  if (!row) return null;
  return {
    enabled: row.enabled,
    scope: row.scope as MatchScope,
    hasLocation: row.latitude !== null && row.longitude !== null,
    country: row.country,
    intro: row.intro ?? "",
    groupSize: row.groupSize,
  };
}

export interface MatchProfileInput {
  enabled: boolean;
  scope: MatchScope;
  latitude?: number | null;
  longitude?: number | null;
  country?: string | null;
  intro?: string;
  groupSize: number;
}

export async function saveMatchProfile(userId: string, input: MatchProfileInput) {
  const hasCoords = typeof input.latitude === "number" && typeof input.longitude === "number";
  const data = {
    enabled: input.enabled,
    scope: input.scope,
    // Undefined keeps the stored location; null clears it.
    ...(input.latitude === null || input.longitude === null
      ? { latitude: null, longitude: null }
      : hasCoords
        ? { latitude: coarse(input.latitude!), longitude: coarse(input.longitude!) }
        : {}),
    ...(input.country !== undefined ? { country: input.country ? input.country.toUpperCase().slice(0, 2) : null } : {}),
    intro: input.intro?.trim().slice(0, 160) || null,
    groupSize: Math.max(MIN_GROUP, Math.min(MAX_GROUP, Math.round(input.groupSize))),
  };
  await prisma.matchProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return getMatchProfile(userId);
}

/** Stop being matched. Circles already joined stay. */
export async function leaveMatching(userId: string) {
  await prisma.matchProfile.deleteMany({ where: { userId } });
}

// ---- matching ----------------------------------------------------------------------------

function distanceKm(a: { latitude: number | null; longitude: number | null }, b: { latitude: number | null; longitude: number | null }) {
  if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) return null;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string | null) => {
  if (!code) return "";
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
};

interface Person {
  userId: string;
  profile: Awaited<ReturnType<typeof prisma.matchProfile.findMany>>[number];
  signals: TasteSignals;
  content: Vector | null;
  music: Vector | null;
  archetype: string;
}

async function loadPerson(profile: Person["profile"]): Promise<Person> {
  const signals = await loadTasteSignals(profile.userId);
  const centroids = await tasteCentroids(signals);
  return {
    userId: profile.userId,
    profile,
    signals,
    content: centroids.content,
    music: centroids.music,
    archetype: signals.ai?.watch.archetype ?? "",
  };
}

/** Embedding cosines for people sit in ~0.55–0.95; rescale to a readable 0–100. */
const toPercent = (cos: number) => Math.round(Math.max(0, Math.min(1, (cos - 0.55) / 0.4)) * 100);

function tasteSimilarity(a: Person, b: Person) {
  const parts: number[] = [];
  if (a.content && b.content) parts.push(dot(a.content, b.content));
  if (a.music && b.music) parts.push(dot(a.music, b.music));
  return parts.length ? parts.reduce((sum, value) => sum + value, 0) / parts.length : 0.55;
}

const intersect = (a: Set<string>, b: Set<string>) => [...a].filter((value) => b.has(value));

async function describeMatch(me: Person, other: Person) {
  const catalog = await loadTasteCatalog();
  const titles = new Map(catalog.content.map((row) => [row.slug, row.title]));
  const artists = new Map(catalog.artists.map((row) => [row.slug, row.title]));
  const myLoved = new Set([...me.signals.favoriteContent, ...me.signals.watched.keys()]);
  const theirLoved = new Set([...other.signals.favoriteContent, ...other.signals.watched.keys()]);
  const sharedTitles = intersect(myLoved, theirLoved).flatMap((slug) => titles.get(slug) ?? []);
  const sharedArtists = intersect(me.signals.followedArtists, other.signals.followedArtists).flatMap((slug) => artists.get(slug) ?? []);

  const reasons: string[] = [];
  if (sharedTitles.length) reasons.push(`Both into ${sharedTitles.slice(0, 2).join(" & ")}${sharedTitles.length > 2 ? ` +${sharedTitles.length - 2}` : ""}`);
  if (sharedArtists.length) reasons.push(`Both follow ${sharedArtists.slice(0, 2).join(" & ")}`);
  if (me.archetype && me.archetype === other.archetype) reasons.push(`Fellow ${VOCAB.archetypes.get(me.archetype)?.label.replace(/^The /, "") ?? "viewer"}`);
  const similarity = tasteSimilarity(me, other);
  if (!reasons.length) reasons.push(similarity > 0.8 ? "Very similar taste" : "Overlapping taste");

  const km = distanceKm(me.profile, other.profile);
  const distanceLabel =
    km !== null && km <= NEARBY_KM * 2
      ? km < 5
        ? "In your area"
        : `~${Math.round(km / 5) * 5} km away`
      : me.profile.country && me.profile.country === other.profile.country
        ? `Also in ${countryName(other.profile.country)}`
        : other.profile.country
          ? `From ${countryName(other.profile.country)}`
          : "Across the world";

  const overlap = Math.min(1, (sharedTitles.length + sharedArtists.length) / 4);
  const proximity = km === null ? 0 : Math.max(0, 1 - km / (NEARBY_KM * 2));
  const score =
    toPercent(similarity) * 0.65 + overlap * 100 * 0.2 + (me.archetype && me.archetype === other.archetype ? 10 : 0) + proximity * 5;
  return { score: Math.round(Math.min(99, score)), reasons, distanceLabel };
}

function inScope(me: Person, other: Person) {
  const scope = me.profile.scope as MatchScope;
  if (scope === "world") return true;
  if (scope === "country") return Boolean(me.profile.country && me.profile.country === other.profile.country);
  const km = distanceKm(me.profile, other.profile);
  return km !== null && km <= NEARBY_KM;
}

/** Name and vibe of a group, from the vibe traits closest to the group's shared taste. */
async function groupVibe(people: Person[]) {
  const index = await loadEmbeddingIndex();
  const shared = centroid(people.flatMap((person) => (person.content ? [{ vector: person.content, weight: 1 }] : [])));
  if (!shared) return { title: "Your Taste Circle", vibe: "People who like what you like" };
  const ranked = [...WATCH_VIBES, ...WATCH_THEMES]
    .flatMap((option) => {
      const vector = index.vectors.get(embeddingKey("trait", `watch:${option.id}`));
      return vector ? [{ option, score: dot(vector, shared) }] : [];
    })
    .sort((a, b) => b.score - a.score);
  const [first, second] = ranked;
  return {
    title: first ? `The ${first.option.label} Circle` : "Your Taste Circle",
    vibe: [first, second].filter(Boolean).map((entry) => `${entry!.option.emoji} ${entry!.option.label}`).join(" · "),
  };
}

export class MatchNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchNotReadyError";
  }
}

// ---- rooms -------------------------------------------------------------------------------

/** Invite everyone at or above this match; below it only if nobody clears the bar. */
const STRONG_MATCH = 60;
/** Most invites one room can send (keeps fan-out sane with many users). */
const MAX_INVITES = 100;
/** Most room popups one person gets per day. */
const DAILY_INVITE_CAP = 5;
const ROOM_TTL_MS = 24 * 3_600_000;
const MIN_CAPACITY = 3;
const MAX_CAPACITY = 12;

/** A name and vibe for a new room, from the creator's own taste. */
export async function suggestRoom(userId: string) {
  const profile = await prisma.matchProfile.findUnique({ where: { userId } });
  if (!profile) return { title: "Your Taste Room", vibe: "" };
  return groupVibe([await loadPerson(profile)]);
}

const INVITE_LINES = [
  (name: string, title: string, score: number) => `🎉 ${name} just opened “${title}” — you're a ${score}% match!`,
  (name: string, title: string, score: number) => `🔥 Your kind of people: ${name}'s room “${title}” matches you ${score}%.`,
  (name: string, title: string, score: number) => `✨ ${score}% vibe match — ${name} wants you in “${title}”.`,
];

function inviteLine(seed: string, name: string, title: string, score: number) {
  const index = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % INVITE_LINES.length;
  return INVITE_LINES[index]!(name, title, score);
}

export interface CreateRoomInput {
  title: string;
  topic?: string;
  scope: MatchScope;
  capacity: number;
}

export interface CreateRoomResult {
  roomId: string;
  communitySlug: string;
  invited: number;
  /** "strong": everyone ≥ 60%; "best-available": nobody cleared the bar, so the best we have. */
  mode: "strong" | "best-available" | "none";
}

/**
 * Open a room: score every opted-in person in its reach against the creator, invite
 * all strong matches (or, while the app is small, the best available), and pop it up
 * for them. Joining is one tap, first come first served until it's full.
 */
export async function createRoom(userId: string, input: CreateRoomInput): Promise<CreateRoomResult> {
  const myProfile = await prisma.matchProfile.findUnique({ where: { userId } });
  if (!myProfile?.enabled) throw new MatchNotReadyError("Turn on AI Match first.");
  if (input.scope === "nearby" && (myProfile.latitude === null || myProfile.longitude === null)) {
    throw new MatchNotReadyError("Share your approximate location in AI Match settings to open a nearby room.");
  }
  const capacity = Math.max(MIN_CAPACITY, Math.min(MAX_CAPACITY, Math.round(input.capacity)));
  const me = await loadPerson({ ...myProfile, scope: input.scope });

  // People already at today's popup cap are skipped.
  const since = new Date(Date.now() - 86_400_000);
  const busy = await prisma.matchCircleMember.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since }, status: "INVITED" },
    _count: { userId: true },
  });
  const capped = new Set(busy.filter((row) => row._count.userId >= DAILY_INVITE_CAP).map((row) => row.userId));
  const others = await prisma.matchProfile.findMany({
    where: { enabled: true, userId: { notIn: [userId, ...capped] } },
  });
  const people = (await Promise.all(others.map(loadPerson))).filter((other) => inScope(me, other));
  const scored = (await Promise.all(people.map(async (other) => ({ other, match: await describeMatch(me, other) })))).sort(
    (a, b) => b.match.score - a.match.score,
  );
  const strong = scored.filter((entry) => entry.match.score >= STRONG_MATCH);
  const invitees = (strong.length ? strong : scored.slice(0, Math.max(5, capacity * 2))).slice(0, MAX_INVITES);
  const mode: CreateRoomResult["mode"] = !invitees.length ? "none" : strong.length ? "strong" : "best-available";

  const vibe = (await groupVibe([me])).vibe;
  const title = input.title.trim().slice(0, 60) || "Your Taste Room";
  const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  const room = await prisma.matchCircle.create({
    data: {
      title,
      vibe,
      topic: input.topic?.trim().slice(0, 120) || null,
      createdById: userId,
      scope: input.scope,
      capacity,
      expiresAt: new Date(Date.now() + ROOM_TTL_MS),
      invitedCount: invitees.length,
      members: {
        create: [
          { userId, status: "ACCEPTED", matchScore: 100, reason: "Opened this room", respondedAt: new Date() },
          ...invitees.map(({ other, match }) => ({
            userId: other.userId,
            matchScore: match.score,
            reason: [...match.reasons.slice(0, 2), match.distanceLabel].join(" · "),
          })),
        ],
      },
    },
  });
  // The room's space exists from the start, so joining drops people straight in.
  const community = await prisma.community.create({
    data: {
      slug: `room-${room.id.slice(-10).toLowerCase()}`,
      name: title,
      category: "AI Room",
      description: `An AI Match room${room.topic ? ` · ${room.topic}` : ""} · ${vibe}`,
      visibility: "PRIVATE",
      activityLevel: "active",
      accent: "purple",
      memberLimit: capacity,
      memberCount: 1,
      members: { create: { userId, role: "ADMIN" } },
      // Ready to go: a watch party channel and a talk room (the listen party is built in).
      watchChannels: { create: { creatorId: userId, title: room.topic ? `Watch party · ${room.topic}`.slice(0, 80) : "Watch party", memberLimit: capacity } },
      voiceChannels: { create: { creatorId: userId, title: "Talk room", memberLimit: Math.min(capacity, 8) } },
    },
  });
  await prisma.matchCircle.update({ where: { id: room.id }, data: { communityId: community.id } });

  if (invitees.length) {
    await prisma.notification.createMany({
      data: invitees.map(({ other, match }) => ({
        userId: other.userId,
        title: inviteLine(room.id + other.userId, creator?.name ?? "Someone", title, match.score),
        category: "ai-match",
        description: `${match.reasons[0] ?? "Similar taste"} · ${match.distanceLabel}${room.topic ? ` · ${room.topic}` : ""}`,
        href: "/dashboard/ai-mode/match",
        actionType: "match-room",
        actionRefId: room.id,
      })),
    });
  }
  return { roomId: room.id, communitySlug: community.slug, invited: invitees.length, mode };
}

async function roomForMember(userId: string, roomId: string) {
  const membership = await prisma.matchCircleMember.findUnique({
    where: { circleId_userId: { circleId: roomId, userId } },
    include: { circle: true },
  });
  if (!membership) {
    const exists = await prisma.matchCircle.count({ where: { id: roomId } });
    throw new MatchNotReadyError(exists ? "This room is invite-only — you weren't matched into it." : "That room doesn't exist any more.");
  }
  return membership;
}

/** Rooms from before spaces existed get their private community on first join. */
async function ensureRoomSpace(roomId: string) {
  const room = await prisma.matchCircle.findUnique({ where: { id: roomId }, include: { members: { where: { status: "ACCEPTED" } } } });
  if (!room || room.communityId) return room?.communityId ?? null;
  const community = await prisma.community.create({
    data: {
      slug: `room-${room.id.slice(-10).toLowerCase()}`,
      name: room.title,
      category: "AI Room",
      description: `An AI Match room${room.topic ? ` · ${room.topic}` : ""} · ${room.vibe}`,
      visibility: "PRIVATE",
      activityLevel: "active",
      accent: "purple",
      memberLimit: room.capacity,
      memberCount: room.members.length,
      members: { create: room.members.map((member) => ({ userId: member.userId, role: member.userId === room.createdById ? "ADMIN" : "MEMBER" })) },
      watchChannels: { create: { creatorId: room.createdById, title: "Watch party", memberLimit: room.capacity } },
      voiceChannels: { create: { creatorId: room.createdById, title: "Talk room", memberLimit: Math.min(room.capacity, 8) } },
    },
  });
  await prisma.matchCircle.update({ where: { id: room.id }, data: { communityId: community.id } });
  return community.id;
}

/** One tap: join if invited, not expired and not full. */
export async function joinRoom(userId: string, roomId: string) {
  const membership = await roomForMember(userId, roomId);
  const room = membership.circle;
  if (membership.status === "ACCEPTED") return room;
  if (membership.status !== "INVITED") throw new MatchNotReadyError("This invite isn't open any more.");
  if (room.expiresAt && room.expiresAt < new Date()) throw new MatchNotReadyError("This room's invite has expired.");

  await ensureRoomSpace(roomId);
  const communityId = (await prisma.matchCircle.findUnique({ where: { id: roomId }, select: { communityId: true } }))?.communityId;
  const joined = await prisma.$transaction(async (tx) => {
    const members = await tx.matchCircleMember.count({ where: { circleId: roomId, status: "ACCEPTED" } });
    if (members >= room.capacity) return false;
    await tx.matchCircleMember.update({ where: { id: membership.id }, data: { status: "ACCEPTED", respondedAt: new Date(), seenAt: new Date() } });
    if (communityId) {
      await tx.communityMember.upsert({
        where: { userId_communityId: { userId, communityId } },
        create: { userId, communityId },
        update: {},
      });
      await tx.community.update({ where: { id: communityId }, data: { memberCount: members + 1 } });
    }
    if (members + 1 >= room.capacity) await tx.matchCircle.update({ where: { id: roomId }, data: { status: "FULL" } });
    return true;
  });
  if (!joined) throw new MatchNotReadyError("Too late — this room just filled up.");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await createNotification({
    userId: room.createdById,
    title: `${user?.name ?? "Someone"} joined “${room.title}”`,
    category: "ai-match",
    href: "/dashboard/ai-mode/match",
    actionType: "match-joined",
    actionRefId: roomId,
  }).catch(() => undefined);
  return room;
}

export async function declineRoom(userId: string, roomId: string) {
  const membership = await roomForMember(userId, roomId);
  if (membership.status !== "INVITED") return;
  await prisma.matchCircleMember.update({ where: { id: membership.id }, data: { status: "DECLINED", respondedAt: new Date(), seenAt: new Date() } });
}

/** The invite popup was shown — it won't pop again (it stays in notifications and the page). */
export async function markRoomInviteSeen(userId: string, roomId: string) {
  await prisma.matchCircleMember.updateMany({ where: { circleId: roomId, userId, seenAt: null }, data: { seenAt: new Date() } });
}

export async function leaveRoom(userId: string, roomId: string) {
  const membership = await roomForMember(userId, roomId);
  if (membership.status !== "ACCEPTED") return;
  await prisma.matchCircleMember.update({ where: { id: membership.id }, data: { status: "LEFT", respondedAt: new Date() } });
  const room = membership.circle;
  if (room.communityId) {
    await prisma.communityMember.deleteMany({ where: { userId, communityId: room.communityId } });
    const remaining = await prisma.matchCircleMember.count({ where: { circleId: roomId, status: "ACCEPTED" } });
    await prisma.community.update({ where: { id: room.communityId }, data: { memberCount: remaining } });
    if (room.status === "FULL" && remaining < room.capacity) await prisma.matchCircle.update({ where: { id: roomId }, data: { status: "OPEN" } });
  }
}

const roomInclude = {
  members: {
    orderBy: { createdAt: "asc" as const },
    include: { user: { select: { name: true, handle: true, avatarColor: true, avatarUrl: true } } },
  },
};

async function communitySlugs(communityIds: string[]) {
  const rows = await prisma.community.findMany({ where: { id: { in: communityIds } }, select: { id: true, slug: true } });
  return new Map(rows.map((row) => [row.id, row.slug]));
}

/** Open invites for this user (newest first); `unseenOnly` for the popup. */
export async function listRoomInvites(userId: string, { unseenOnly = false } = {}): Promise<RoomInvite[]> {
  const rows = await prisma.matchCircleMember.findMany({
    where: {
      userId,
      status: "INVITED",
      ...(unseenOnly ? { seenAt: null } : {}),
      circle: { status: "OPEN", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    },
    include: { circle: { include: roomInclude } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((row) => {
    const room = row.circle;
    const creator = room.members.find((member) => member.userId === room.createdById);
    const joined = room.members.filter((member) => member.status === "ACCEPTED");
    return {
      roomId: room.id,
      title: room.title,
      vibe: room.vibe,
      topic: room.topic ?? undefined,
      scope: room.scope as MatchScope,
      creatorName: creator?.user.name ?? "Someone",
      creatorHandle: creator?.user.handle ?? "",
      creatorAvatarColor: creator?.user.avatarColor ?? "#ff00cc",
      creatorAvatarUrl: creator?.user.avatarUrl ?? undefined,
      matchScore: row.matchScore,
      reason: row.reason,
      headline: inviteLine(room.id + userId, creator?.user.name ?? "Someone", room.title, row.matchScore),
      joinedCount: joined.length,
      capacity: room.capacity,
      expiresAt: room.expiresAt?.toISOString(),
    };
  });
}

/** Rooms the user is in. */
export async function listMyRooms(userId: string): Promise<RoomView[]> {
  const rows = await prisma.matchCircle.findMany({
    where: { members: { some: { userId, status: "ACCEPTED" } } },
    include: roomInclude,
    orderBy: { updatedAt: "desc" },
  });
  for (const row of rows) if (!row.communityId) row.communityId = await ensureRoomSpace(row.id);
  const slugs = await communitySlugs(rows.flatMap((row) => row.communityId ?? []));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    vibe: row.vibe,
    topic: row.topic ?? undefined,
    scope: row.scope as MatchScope,
    status: row.status as RoomView["status"],
    capacity: row.capacity,
    invitedCount: row.invitedCount,
    createdByMe: row.createdById === userId,
    communitySlug: row.communityId ? slugs.get(row.communityId) : undefined,
    members: row.members
      .filter((member) => member.status === "ACCEPTED")
      .map((member) => ({
        userId: member.userId,
        name: member.user.name,
        handle: member.user.handle,
        avatarColor: member.user.avatarColor,
        avatarUrl: member.user.avatarUrl ?? undefined,
        matchScore: member.matchScore,
        reason: member.reason,
        isMe: member.userId === userId,
        isHost: member.userId === row.createdById,
      })),
  }));
}
