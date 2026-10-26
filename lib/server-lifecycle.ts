import type { Server as SocketServer } from "socket.io";

/**
 * Lets an app server leave the load balancer without dropping anyone. On SIGTERM (docker
 * stop, a deploy, the `down` script):
 *  1. /api/health starts failing, so the load balancer stops sending new visitors here —
 *     while this server keeps serving whatever still arrives until the balancer notices.
 *  2. Realtime connections close. Browsers reconnect on their own, through the balancer,
 *     to a healthy server, and rejoin their chats, parties and talk rooms there.
 *  3. The HTTP server stops taking connections and lets in-flight requests finish.
 *
 * The flag is on globalThis: server.ts sets it, the health route (Next's bundle) reads it.
 */
const globalForLifecycle = globalThis as unknown as { __entertainverseDraining?: boolean };

export function isDraining() {
  return globalForLifecycle.__entertainverseDraining === true;
}

/** Socket.IO's disconnect reason when this server closes connections because it's stopping. */
export const SERVER_SHUTDOWN = "server shutting down";

export async function shutDown(io: SocketServer, drainMs: number) {
  globalForLifecycle.__entertainverseDraining = true;
  await new Promise((resolve) => setTimeout(resolve, drainMs));
  // Also closes the HTTP server it's attached to, which waits for in-flight requests.
  await io.close();
}
