import { request, type APIRequestContext } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import { DEMO_USER } from "./auth";

/** Two seeded users who share communities — enough for parties and DMs. */
export const AISHA = { email: "aisha@entertainverse.local", handle: "aisha_khan" };
export const VIKRAM = { email: "vikram@entertainverse.local", handle: "vikram_patel" };

export interface SignedIn {
  api: APIRequestContext;
  /** Session cookie header, for realtime connections. */
  cookie: string;
}

/** Sign in through one server (or the load balancer); the session works on every server. */
export async function signInApi(baseURL: string, email: string, extraHeaders?: Record<string, string>): Promise<SignedIn> {
  const api = await request.newContext({ baseURL, extraHTTPHeaders: extraHeaders });
  const { csrfToken } = await (await api.get("/api/auth/csrf")).json();
  await api.post("/api/auth/callback/credentials", {
    form: { identifier: email, password: DEMO_USER.password, csrfToken },
    maxRedirects: 0,
  });
  const cookie = (await api.storageState()).cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  return { api, cookie };
}

/** A realtime connection like a browser tab's, to one server or through the load balancer. */
export async function connect(baseURL: string, cookie: string): Promise<Socket> {
  const socket = io(baseURL, { path: "/api/socket/io", transports: ["websocket"], extraHeaders: { cookie } });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return socket;
}

/** The first `event` matching `test`; fails after `timeoutMs`. */
export function nextEvent<T>(socket: Socket, event: string, test: (data: T) => boolean = () => true, timeoutMs = 10_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`no "${event}" within ${timeoutMs}ms`));
    }, timeoutMs);
    const handler = (data: T) => {
      if (!test(data)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    };
    socket.on(event, handler);
  });
}

export interface PartyState {
  hostId: string | null;
  positionSec: number;
  members: { userId: string; name: string }[];
}

export const firstNames = (state: PartyState) => state.members.map((member) => member.name.split(" ")[0]).sort();
