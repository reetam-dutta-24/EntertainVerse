import { ScreenTimeGuard } from "@/components/screen-time/screen-time-guard";
import { ScreenTimeLock } from "@/components/screen-time/screen-time-lock";
import { getScreenTimeStatus } from "@/lib/services/screen-time.service";

/**
 * Server-side enforcement of the daily limit for signed-in app pages: once today's
 * limit is used up, the page itself is replaced by the lock screen — reloading or
 * opening a new tab doesn't get around it. Otherwise the guard tracks the time.
 */
export async function ScreenTimeGate({ userId, children }: { userId?: string | null; children: React.ReactNode }) {
  if (!userId) return <>{children}</>;
  const status = await getScreenTimeStatus(userId).catch(() => null);
  if (!status?.enabled) return <>{children}</>;
  if (status.locked && status.limitMinutes) {
    return <ScreenTimeLock limitMinutes={status.limitMinutes} unlocksAt={status.unlocksAt} />;
  }
  return (
    <>
      {children}
      <ScreenTimeGuard initialStatus={status} />
    </>
  );
}
