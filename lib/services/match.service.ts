import "server-only";

import { prisma } from "@/lib/prisma";
import { VOCAB, WATCH_THEMES, WATCH_VIBES } from "@/lib/ai-profile/vocabulary";
import { centroid, dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import { createNotification } from "@/lib/services/notification.service";
import { loadTasteCatalog, loadTasteSignals, tasteCentroids, type TasteSignals } from "@/lib/services/taste-engine.service";
import type { CircleProposal, CircleView, MatchPerson, MatchProfileView, MatchScope } from "@/lib/match/types";

/**
 * AI Match: groups people with similar taste and personality — nearby, in the same
 * country, or worldwide. Only opted-in users are ever matched; location is coarse
 * (~10 km) and only turned into a rough distance label, never shown.
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

async function personView(me: Person, other: Person): Promise<MatchPerson> {
  const user = await prisma.user.findUnique({
    where: { id: other.userId },
    select: { name: true, handle: true, avatarColor: true, avatarUrl: true },
  });
  const match = await describeMatch(me, other);
  return {
    userId: other.userId,
    name: user?.name ?? "AniVerse user",
    handle: user?.handle ?? "",
    avatarColor: user?.avatarColor ?? "#ff00cc",
    avatarUrl: user?.avatarUrl ?? undefined,
    intro: other.profile.intro ?? undefined,
    matchScore: match.score,
    reasons: match.reasons,
    distanceLabel: match.distanceLabel,
  };
}

export class MatchNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchNotReadyError";
  }
}

/**
 * Propose a circle: rank opted-in people in scope by taste match, then add members
 * greedily so the group fits together (each pick also has to fit those already in).
 */
export async function proposeCircle(userId: string, excludeIds: string[] = []): Promise<CircleProposal> {
  const myProfile = await prisma.matchProfile.findUnique({ where: { userId } });
  if (!myProfile?.enabled) throw new MatchNotReadyError("Turn on AI Match first.");
  if (myProfile.scope === "nearby" && (myProfile.latitude === null || myProfile.longitude === null)) {
    throw new MatchNotReadyError("Share your approximate location to match nearby, or switch to My country / Worldwide.");
  }

  const others = await prisma.matchProfile.findMany({
    where: { enabled: true, userId: { notIn: [userId, ...excludeIds] } },
  });
  const me = await loadPerson(myProfile);
  const people = (await Promise.all(others.map(loadPerson))).filter((other) => inScope(me, other));
  if (!people.length) {
    throw new MatchNotReadyError(
      myProfile.scope === "world" ? "Nobody else has turned on AI Match yet — check back soon." : "No matches in this area yet — try a wider scope.",
    );
  }

  const scored = await Promise.all(people.map(async (other) => ({ other, match: await describeMatch(me, other) })));
  scored.sort((a, b) => b.match.score - a.match.score);

  const wanted = Math.max(MIN_GROUP, Math.min(MAX_GROUP, myProfile.groupSize)) - 1;
  const picked: Person[] = [];
  const pool = [...scored];
  while (picked.length < wanted && pool.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    pool.forEach((entry, index) => {
      const cohesion = picked.length
        ? picked.reduce((sum, member) => sum + toPercent(tasteSimilarity(member, entry.other)), 0) / picked.length
        : entry.match.score;
      const value = entry.match.score * 0.6 + cohesion * 0.4;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    picked.push(pool.splice(bestIndex, 1)[0]!.other);
  }

  const vibe = await groupVibe([me, ...picked]);
  return { ...vibe, members: await Promise.all(picked.map((other) => personView(me, other))) };
}

// ---- circles -----------------------------------------------------------------------------

export async function createCircle(userId: string, input: { title: string; vibe: string; memberIds: string[] }) {
  const memberIds = [...new Set(input.memberIds)].filter((id) => id !== userId).slice(0, MAX_GROUP - 1);
  if (!memberIds.length) throw new MatchNotReadyError("Pick at least one person to invite.");
  const [myProfile, profiles] = await Promise.all([
    prisma.matchProfile.findUnique({ where: { userId } }),
    prisma.matchProfile.findMany({ where: { userId: { in: memberIds }, enabled: true } }),
  ]);
  if (!myProfile?.enabled) throw new MatchNotReadyError("Turn on AI Match first.");
  // Only people who opted in can be invited.
  const me = await loadPerson(myProfile);
  const invitees = await Promise.all(profiles.map(loadPerson));
  if (!invitees.length) throw new MatchNotReadyError("Those people aren't available for matching any more.");
  const views = await Promise.all(invitees.map((other) => personView(me, other)));
  const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  const circle = await prisma.matchCircle.create({
    data: {
      title: input.title.trim().slice(0, 60) || "Your Taste Circle",
      vibe: input.vibe.trim().slice(0, 120),
      createdById: userId,
      members: {
        create: [
          { userId, status: "ACCEPTED", matchScore: 100, reason: "Started this circle", respondedAt: new Date() },
          ...views.map((view) => ({
            userId: view.userId,
            matchScore: view.matchScore,
            reason: [...view.reasons.slice(0, 2), view.distanceLabel].join(" · "),
          })),
        ],
      },
    },
  });
  await Promise.all(
    views.map((view) =>
      createNotification({
        userId: view.userId,
        title: `${inviter?.name ?? "Someone"} invited you to “${circle.title}”`,
        category: "ai-match",
        description: `AI Match thinks you'd click: ${view.reasons[0] ?? "similar taste"}.`,
        href: "/dashboard/ai-mode/match",
        actionType: "match-invite",
        actionRefId: circle.id,
      }).catch(() => undefined),
    ),
  );
  return circle.id;
}

/** The circle's private space: a private community with chat, posts and rooms. */
async function activateCircle(circleId: string) {
  const circle = await prisma.matchCircle.findUnique({ where: { id: circleId }, include: { members: true } });
  if (!circle) return;
  const accepted = circle.members.filter((member) => member.status === "ACCEPTED");
  if (accepted.length < 2) return;

  if (!circle.communityId) {
    const community = await prisma.community.create({
      data: {
        slug: `circle-${circle.id.slice(-10).toLowerCase()}`,
        name: circle.title,
        category: "Circle",
        description: `An AI Match circle · ${circle.vibe}. Chat, share what you're watching and set up rooms together.`,
        visibility: "PRIVATE",
        activityLevel: "active",
        accent: "purple",
        memberLimit: MAX_GROUP,
        memberCount: accepted.length,
        members: {
          create: accepted.map((member) => ({ userId: member.userId, role: member.userId === circle.createdById ? "ADMIN" : "MEMBER" })),
        },
      },
    });
    await prisma.matchCircle.update({ where: { id: circle.id }, data: { status: "ACTIVE", communityId: community.id } });
    return;
  }
  for (const member of accepted) {
    await prisma.communityMember.upsert({
      where: { userId_communityId: { userId: member.userId, communityId: circle.communityId } },
      create: { userId: member.userId, communityId: circle.communityId },
      update: {},
    });
  }
  await prisma.community.update({ where: { id: circle.communityId }, data: { memberCount: accepted.length } });
}

export async function respondToCircle(userId: string, circleId: string, action: "accept" | "decline" | "leave") {
  const membership = await prisma.matchCircleMember.findUnique({ where: { circleId_userId: { circleId, userId } }, include: { circle: true } });
  if (!membership) throw new MatchNotReadyError("That circle doesn't exist any more.");

  if (action === "leave") {
    await prisma.matchCircleMember.update({ where: { id: membership.id }, data: { status: "LEFT", respondedAt: new Date() } });
    if (membership.circle.communityId) {
      await prisma.communityMember.deleteMany({ where: { userId, communityId: membership.circle.communityId } });
      const remaining = await prisma.matchCircleMember.count({ where: { circleId, status: "ACCEPTED" } });
      await prisma.community.update({ where: { id: membership.circle.communityId }, data: { memberCount: remaining } });
    }
    return;
  }
  if (membership.status !== "INVITED") return;
  await prisma.matchCircleMember.update({
    where: { id: membership.id },
    data: { status: action === "accept" ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
  });
  if (action === "accept") {
    await activateCircle(circleId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await createNotification({
      userId: membership.circle.createdById,
      title: `${user?.name ?? "Someone"} joined “${membership.circle.title}”`,
      category: "ai-match",
      href: "/dashboard/ai-mode/match",
      actionType: "match-joined",
      actionRefId: circleId,
    }).catch(() => undefined);
  }
}

export async function listMyCircles(userId: string): Promise<CircleView[]> {
  const rows = await prisma.matchCircle.findMany({
    where: { members: { some: { userId, status: { in: ["INVITED", "ACCEPTED"] } } } },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, handle: true, avatarColor: true, avatarUrl: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  const communities = await prisma.community.findMany({
    where: { id: { in: rows.flatMap((row) => row.communityId ?? []) } },
    select: { id: true, slug: true },
  });
  const slugOf = new Map(communities.map((community) => [community.id, community.slug]));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    vibe: row.vibe,
    status: row.status as CircleView["status"],
    myStatus: (row.members.find((member) => member.userId === userId)?.status ?? "INVITED") as CircleView["myStatus"],
    createdByMe: row.createdById === userId,
    communitySlug: row.communityId ? slugOf.get(row.communityId) : undefined,
    members: row.members
      .filter((member) => member.status !== "DECLINED" && member.status !== "LEFT")
      .map((member) => ({
        userId: member.userId,
        name: member.user.name,
        handle: member.user.handle,
        avatarColor: member.user.avatarColor,
        avatarUrl: member.user.avatarUrl ?? undefined,
        status: member.status as CircleView["members"][number]["status"],
        matchScore: member.matchScore,
        reason: member.reason,
        isMe: member.userId === userId,
      })),
  }));
}
