const POLL_MS = 20_000;

export interface DmUnreadSummary {
  unreadChatCount: number;
  totalUnreadMessages: number;
}

const EMPTY: DmUnreadSummary = { unreadChatCount: 0, totalUnreadMessages: 0 };

let snapshot: DmUnreadSummary = EMPTY;
const listeners = new Set<() => void>();
let subscriberCount = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let fetching = false;

function emit() {
  for (const listener of listeners) listener();
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    void refreshMessagesUnread();
  }
}

export async function refreshMessagesUnread() {
  if (fetching) return;
  fetching = true;

  try {
    const response = await fetch("/api/dm/unread", { cache: "no-store" });
    if (response.status === 401) {
      snapshot = EMPTY;
      emit();
      return;
    }
    if (!response.ok) return;

    const data = (await response.json()) as Partial<DmUnreadSummary>;
    snapshot = {
      unreadChatCount:
        typeof data.unreadChatCount === "number" ? data.unreadChatCount : 0,
      totalUnreadMessages:
        typeof data.totalUnreadMessages === "number"
          ? data.totalUnreadMessages
          : 0,
    };
    emit();
  } catch {
    // Keep last snapshot on transient errors.
  } finally {
    fetching = false;
  }
}

function startLiveSync() {
  if (pollTimer) return;
  void refreshMessagesUnread();
  pollTimer = setInterval(() => void refreshMessagesUnread(), POLL_MS);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
}

function stopLiveSync() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }
}

export function subscribeMessagesUnread(listener: () => void): () => void {
  listeners.add(listener);
  subscriberCount += 1;
  if (subscriberCount === 1) startLiveSync();

  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) stopLiveSync();
  };
}

export function getMessagesUnreadSnapshot(): DmUnreadSummary {
  return snapshot;
}
