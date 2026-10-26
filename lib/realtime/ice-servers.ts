/**
 * ICE servers for browser-to-browser calls (talk rooms, live hosting).
 *
 * STUN alone connects most home networks. Phones on mobile data and many office
 * networks also need a TURN relay — set it with:
 *   TURN_URLS        comma-separated, e.g. "turn:turn.example.com:3478,turns:turn.example.com:5349"
 *   TURN_USERNAME
 *   TURN_CREDENTIAL
 * Served by GET /api/realtime/ice so credentials stay out of the JS bundle and can change
 * without a rebuild.
 */

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export function iceServersFromEnv(env: Record<string, string | undefined> = process.env): RTCIceServer[] {
  const urls = (env.TURN_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => /^turns?:/.test(url));
  if (!urls.length || !env.TURN_USERNAME || !env.TURN_CREDENTIAL) return DEFAULT_ICE_SERVERS;
  return [...DEFAULT_ICE_SERVERS, { urls, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL }];
}

/** Client: the server's ICE list, or plain STUN if it can't be fetched. */
export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const response = await fetch("/api/realtime/ice", { cache: "no-store" });
    if (!response.ok) return DEFAULT_ICE_SERVERS;
    const data = (await response.json()) as { iceServers?: RTCIceServer[] };
    return data.iceServers?.length ? data.iceServers : DEFAULT_ICE_SERVERS;
  } catch {
    return DEFAULT_ICE_SERVERS;
  }
}
