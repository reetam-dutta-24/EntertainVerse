import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../helpers/prisma-mock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { getScreenTimeStatus, localDay, recordHeartbeat, updateDailyLimit } = await import("@/lib/services/screen-time.service");

// ---- In-memory tables -------------------------------------------------------------------
interface Settings {
  id: string;
  userId: string;
  dailyLimitMinutes: number | null;
  pendingLimitMinutes: number | null;
  pendingFromDay: string | null;
  timezone: string | null;
}
interface Day {
  id: string;
  userId: string;
  day: string;
  minutes: number;
  lastBeatAt: Date | null;
  lockedAt: Date | null;
}
let settings: Map<string, Settings>;
let days: Map<string, Day>;

const USER = "u1";
const IST = "Asia/Kolkata"; // UTC+5:30, no DST

/** Set the clock; IST times read naturally: at("2026-03-10T21:00", IST). */
const at = (iso: string) => vi.setSystemTime(new Date(iso));
const minutes = (n: number) => vi.advanceTimersByTime(n * 60_000);

async function beatFor(n: number) {
  for (let i = 0; i < n; i++) {
    await recordHeartbeat(USER);
    minutes(1);
  }
}

function withLimit(limit: number | null, fields: Partial<Settings> = {}) {
  settings.set(USER, { id: "s1", userId: USER, dailyLimitMinutes: limit, pendingLimitMinutes: null, pendingFromDay: null, timezone: IST, ...fields });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  at("2026-03-10T12:00:00+05:30");
  settings = new Map();
  days = new Map();

  const findSettings = (where: { id?: string; userId?: string }) => [...settings.values()].find((row) => row.id === where.id || row.userId === where.userId);
  prisma.screenTimeSettings.findUnique.mockImplementation(async ({ where }) => findSettings(where) ?? null);
  prisma.screenTimeSettings.update.mockImplementation(async ({ where, data }) => Object.assign(findSettings(where)!, data));
  prisma.screenTimeSettings.upsert.mockImplementation(async ({ where, create, update }) => {
    const existing = findSettings(where);
    if (existing) return Object.assign(existing, update);
    const row = { id: "s1", pendingLimitMinutes: null, pendingFromDay: null, timezone: null, dailyLimitMinutes: null, ...create };
    settings.set(row.userId, row);
    return row;
  });

  const dayKey = ({ userId, day }: { userId: string; day: string }) => `${userId}|${day}`;
  prisma.screenTimeDay.findUnique.mockImplementation(async ({ where }) => days.get(dayKey(where.userId_day)) ?? null);
  prisma.screenTimeDay.upsert.mockImplementation(async ({ where, create }) => {
    const key = dayKey(where.userId_day);
    if (!days.has(key)) days.set(key, { id: key, minutes: 0, lastBeatAt: null, lockedAt: null, ...create });
    return { ...days.get(key)! };
  });
  prisma.screenTimeDay.update.mockImplementation(async ({ where, data }) => Object.assign(days.get(where.id)!, data));
});

afterEach(() => {
  vi.useRealTimers();
});

// ---- Tests --------------------------------------------------------------------------------

describe("localDay", () => {
  it("uses the user's time zone for the calendar day", () => {
    const lateEvening = new Date("2026-03-10T23:30:00+05:30");
    expect(localDay(IST, lateEvening)).toBe("2026-03-10");
    expect(localDay("UTC", lateEvening)).toBe("2026-03-10");
    expect(localDay("America/New_York", lateEvening)).toBe("2026-03-10");
    expect(localDay(IST, new Date("2026-03-10T19:00:00Z"))).toBe("2026-03-11");
  });
});

describe("getScreenTimeStatus", () => {
  it("is off without settings", async () => {
    expect(await getScreenTimeStatus(USER)).toMatchObject({ enabled: false, limitMinutes: null, locked: false, warn: false, timezone: "UTC" });
  });

  it("falls back to UTC for an unknown time zone", async () => {
    withLimit(30, { timezone: "Mars/Olympus_Mons" });
    expect((await getScreenTimeStatus(USER)).timezone).toBe("UTC");
  });

  it("unlocks at the next local midnight", async () => {
    withLimit(30);
    expect((await getScreenTimeStatus(USER)).unlocksAt).toBe(new Date("2026-03-11T00:00:00+05:30").toISOString());
  });
});

describe("recordHeartbeat", () => {
  it("counts one minute per visible minute", async () => {
    withLimit(30);
    await beatFor(3);
    expect(await getScreenTimeStatus(USER)).toMatchObject({ usedMinutes: 3, remainingMinutes: 27, locked: false });
  });

  it("doesn't double-count several open tabs", async () => {
    withLimit(30);
    // Three tabs beating within the same minute.
    await recordHeartbeat(USER);
    vi.advanceTimersByTime(10_000);
    await recordHeartbeat(USER);
    vi.advanceTimersByTime(10_000);
    await recordHeartbeat(USER);
    expect((await getScreenTimeStatus(USER)).usedMinutes).toBe(1);

    vi.advanceTimersByTime(45_000);
    await recordHeartbeat(USER);
    expect((await getScreenTimeStatus(USER)).usedMinutes).toBe(2);
  });

  it("warns in the last five minutes", async () => {
    withLimit(10);
    await beatFor(4);
    expect((await getScreenTimeStatus(USER)).warn).toBe(false);
    await beatFor(1);
    expect(await getScreenTimeStatus(USER)).toMatchObject({ remainingMinutes: 5, warn: true });
  });

  it("locks when the limit is reached and stops counting", async () => {
    withLimit(3);
    await beatFor(3);
    const status = await getScreenTimeStatus(USER);
    expect(status).toMatchObject({ usedMinutes: 3, remainingMinutes: 0, locked: true, warn: false });
    expect(days.get(`${USER}|2026-03-10`)!.lockedAt).toBeInstanceOf(Date);

    await beatFor(5);
    expect((await getScreenTimeStatus(USER)).usedMinutes).toBe(3);
  });

  it("starts fresh after local midnight", async () => {
    withLimit(3);
    at("2026-03-10T23:50:00+05:30");
    await beatFor(3);
    expect((await getScreenTimeStatus(USER)).locked).toBe(true);

    at("2026-03-11T00:00:30+05:30");
    expect(await getScreenTimeStatus(USER)).toMatchObject({ day: "2026-03-11", usedMinutes: 0, locked: false });
  });

  it("does nothing without a limit", async () => {
    await beatFor(3);
    withLimit(null);
    await beatFor(3);
    expect(prisma.screenTimeDay.upsert).not.toHaveBeenCalled();
  });
});

describe("updateDailyLimit", () => {
  it("turns a limit on immediately, in the given time zone", async () => {
    const change = await updateDailyLimit(USER, 60, IST);
    expect(change.appliesFrom).toBe("now");
    expect(change.status).toMatchObject({ enabled: true, limitMinutes: 60, timezone: IST });
  });

  it("lowers a limit immediately", async () => {
    withLimit(60);
    const change = await updateDailyLimit(USER, 30, IST);
    expect(change.appliesFrom).toBe("now");
    expect(change.status.limitMinutes).toBe(30);
  });

  it.each([
    ["raising it", 120],
    ["switching it off", null],
  ])("waits until tomorrow for %s", async (_, next) => {
    withLimit(60);
    const change = await updateDailyLimit(USER, next, IST);

    expect(change.appliesFrom).toBe("tomorrow");
    expect(change.status).toMatchObject({ limitMinutes: 60, pending: { limitMinutes: next, fromDay: "2026-03-11" } });

    at("2026-03-11T00:00:30+05:30");
    expect(await getScreenTimeStatus(USER)).toMatchObject({ limitMinutes: next, pending: null });
  });

  it("can't dodge a lock by raising the limit", async () => {
    withLimit(3);
    await beatFor(3);
    await updateDailyLimit(USER, 240, IST);
    expect((await getScreenTimeStatus(USER)).locked).toBe(true);
  });

  it("setting the current limit again cancels a waiting change", async () => {
    withLimit(60, { pendingLimitMinutes: null, pendingFromDay: "2026-03-11" });
    const change = await updateDailyLimit(USER, 60, IST);
    expect(change).toMatchObject({ appliesFrom: "unchanged", status: { pending: null } });

    at("2026-03-11T09:00:00+05:30");
    expect((await getScreenTimeStatus(USER)).limitMinutes).toBe(60);
  });

  it("ignores a new time zone while a limit is active (no early midnight)", async () => {
    withLimit(60);
    await updateDailyLimit(USER, 30, "Pacific/Kiritimati");
    expect((await getScreenTimeStatus(USER)).timezone).toBe(IST);
  });

  it("follows a new time zone when turning the limit on", async () => {
    withLimit(null, { timezone: IST });
    await updateDailyLimit(USER, 30, "Europe/London");
    expect((await getScreenTimeStatus(USER)).timezone).toBe("Europe/London");
  });
});
