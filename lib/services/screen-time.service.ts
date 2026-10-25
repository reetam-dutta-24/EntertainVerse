import "server-only";

import { prisma } from "@/lib/prisma";
import { WARN_AT_MINUTES, type ScreenTimeStatus } from "@/lib/screen-time/types";

/**
 * Daily limit ("Mindful mode"). Usage is counted from heartbeats sent once a minute
 * while an app tab is visible; at most one minute is counted per ~minute however many
 * tabs are open. When the day's minutes reach the limit the app locks until local
 * midnight — enforced in the server layouts, not just the UI.
 */

/** Minimum gap between counted heartbeats (several tabs never double-count). */
const BEAT_GAP_MS = 50_000;

function safeZone(timezone?: string | null) {
  if (!timezone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return "UTC";
  }
}

function parts(timezone: string, date = new Date()) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return values as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
}

/** Local calendar day, YYYY-MM-DD. */
export function localDay(timezone: string, date = new Date()) {
  const p = parts(timezone, date);
  return `${p.year}-${p.month}-${p.day}`;
}

function tomorrow(timezone: string) {
  return localDay(timezone, new Date(Date.now() + 86_400_000));
}

/** The next local midnight as an instant. */
function nextMidnight(timezone: string) {
  const p = parts(timezone);
  const secondsToday = Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second);
  return new Date(Date.now() + (86_400 - secondsToday) * 1000);
}

type SettingsRow = Awaited<ReturnType<typeof prisma.screenTimeSettings.findUnique>>;

/** Apply a raise / switch-off once its day has come. */
async function settle(settings: NonNullable<SettingsRow>, today: string) {
  if (!settings.pendingFromDay || settings.pendingFromDay > today) return settings;
  return prisma.screenTimeSettings.update({
    where: { id: settings.id },
    data: { dailyLimitMinutes: settings.pendingLimitMinutes, pendingLimitMinutes: null, pendingFromDay: null },
  });
}

async function statusFor(userId: string, settings: SettingsRow): Promise<ScreenTimeStatus> {
  const timezone = safeZone(settings?.timezone);
  const today = localDay(timezone);
  const current = settings ? await settle(settings, today) : null;
  const limit = current?.dailyLimitMinutes ?? null;
  const usage = limit ? await prisma.screenTimeDay.findUnique({ where: { userId_day: { userId, day: today } } }) : null;
  const used = usage?.minutes ?? 0;
  const remaining = limit ? Math.max(0, limit - used) : null;
  return {
    enabled: Boolean(limit),
    limitMinutes: limit,
    usedMinutes: used,
    remainingMinutes: remaining,
    locked: limit !== null && used >= limit,
    warn: remaining !== null && remaining > 0 && remaining <= WARN_AT_MINUTES,
    unlocksAt: nextMidnight(timezone).toISOString(),
    day: today,
    pending: current?.pendingFromDay ? { limitMinutes: current.pendingLimitMinutes, fromDay: current.pendingFromDay } : null,
    timezone,
  };
}

export async function getScreenTimeStatus(userId: string): Promise<ScreenTimeStatus> {
  return statusFor(userId, await prisma.screenTimeSettings.findUnique({ where: { userId } }));
}

/** One visible-tab minute. Counts at most once per BEAT_GAP_MS. */
export async function recordHeartbeat(userId: string): Promise<ScreenTimeStatus> {
  // The time zone is only set from Settings — heartbeats can't move the day boundary,
  // so changing the device clock's zone doesn't unlock a new "day" early.
  const settings = await prisma.screenTimeSettings.findUnique({ where: { userId } });
  if (!settings) return statusFor(userId, null);
  const status = await statusFor(userId, settings);
  if (!status.enabled || status.locked) return status;

  const now = new Date();
  const day = await prisma.screenTimeDay.upsert({
    where: { userId_day: { userId, day: status.day } },
    create: { userId, day: status.day },
    update: {},
  });
  if (day.lastBeatAt && now.getTime() - day.lastBeatAt.getTime() < BEAT_GAP_MS) return status;

  const minutes = day.minutes + 1;
  await prisma.screenTimeDay.update({
    where: { id: day.id },
    data: { minutes, lastBeatAt: now, ...(status.limitMinutes && minutes >= status.limitMinutes ? { lockedAt: now } : {}) },
  });
  return statusFor(userId, settings);
}

export interface LimitChange {
  status: ScreenTimeStatus;
  /** "now" when it applied immediately, "tomorrow" when it waits. */
  appliesFrom: "now" | "tomorrow" | "unchanged";
}

/**
 * Strict by design: turning the limit on or lowering it applies now; raising it or
 * switching it off waits until tomorrow (setting it back cancels the wait).
 */
export async function updateDailyLimit(userId: string, limitMinutes: number | null, timezone?: string): Promise<LimitChange> {
  const zone = safeZone(timezone);
  const existing = await prisma.screenTimeSettings.findUnique({ where: { userId } });
  const settled = existing ? await settle(existing, localDay(safeZone(existing.timezone))) : null;
  const current = settled?.dailyLimitMinutes ?? null;

  let appliesFrom: LimitChange["appliesFrom"];
  if (limitMinutes === current) {
    appliesFrom = "unchanged";
    if (settled?.pendingFromDay) {
      await prisma.screenTimeSettings.update({ where: { userId }, data: { pendingLimitMinutes: null, pendingFromDay: null } });
    }
  } else if (current === null || (limitMinutes !== null && limitMinutes < current)) {
    appliesFrom = "now";
    await prisma.screenTimeSettings.upsert({
      where: { userId },
      create: { userId, dailyLimitMinutes: limitMinutes, timezone: zone },
      // The day boundary only follows a new time zone while no limit is active.
      update: { dailyLimitMinutes: limitMinutes, pendingLimitMinutes: null, pendingFromDay: null, ...(current === null ? { timezone: zone } : {}) },
    });
  } else {
    appliesFrom = "tomorrow";
    await prisma.screenTimeSettings.update({
      where: { userId },
      data: { pendingLimitMinutes: limitMinutes, pendingFromDay: tomorrow(safeZone(settled?.timezone ?? zone)) },
    });
  }
  return { status: await getScreenTimeStatus(userId), appliesFrom };
}
