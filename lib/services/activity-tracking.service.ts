import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Real watch / listen time for analytics, the recommender and roadmaps. A viewing or
 * listening session is one event row; the client reports each further minute against
 * the same session, so a 40-minute episode is one 40-minute event, not 40 rows.
 */

/** Longest single report we accept (a tab asleep for hours can't dump a day of minutes). */
const MAX_MINUTES_PER_REPORT = 5;

export interface TrackingResult {
  sessionId: string;
  minutes: number;
}

export async function recordWatchMinutes(
  userId: string,
  contentSlug: string,
  input: { sessionId?: string; minutes: number },
): Promise<TrackingResult | null> {
  const content = await prisma.content.findUnique({ where: { slug: contentSlug }, select: { id: true } });
  if (!content) return null;
  const minutes = Math.max(1, Math.min(MAX_MINUTES_PER_REPORT, Math.round(input.minutes)));

  if (input.sessionId) {
    const session = await prisma.watchEvent.findFirst({
      where: { id: input.sessionId, userId, contentId: content.id },
      select: { id: true },
    });
    if (session) {
      const updated = await prisma.watchEvent.update({
        where: { id: session.id },
        data: { minutes: { increment: minutes } },
        select: { id: true, minutes: true },
      });
      return { sessionId: updated.id, minutes: updated.minutes };
    }
  }
  const created = await prisma.watchEvent.create({
    data: { userId, contentId: content.id, minutes },
    select: { id: true, minutes: true },
  });
  return { sessionId: created.id, minutes: created.minutes };
}

export async function recordListenMinutes(
  userId: string,
  trackSlug: string,
  input: { sessionId?: string; minutes: number },
): Promise<TrackingResult | null> {
  const track = await prisma.musicTrack.findUnique({ where: { slug: trackSlug }, select: { id: true } });
  if (!track) return null;
  const minutes = Math.max(1, Math.min(MAX_MINUTES_PER_REPORT, Math.round(input.minutes)));

  if (input.sessionId) {
    const session = await prisma.listenEvent.findFirst({
      where: { id: input.sessionId, userId, trackId: track.id },
      select: { id: true },
    });
    if (session) {
      const updated = await prisma.listenEvent.update({
        where: { id: session.id },
        data: { minutes: { increment: minutes } },
        select: { id: true, minutes: true },
      });
      return { sessionId: updated.id, minutes: updated.minutes };
    }
  }
  const created = await prisma.listenEvent.create({
    data: { userId, trackId: track.id, minutes },
    select: { id: true, minutes: true },
  });
  return { sessionId: created.id, minutes: created.minutes };
}
