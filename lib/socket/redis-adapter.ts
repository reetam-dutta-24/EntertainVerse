import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { Server as SocketIOServer } from "socket.io";

/**
 * Lets several app servers share Socket.IO rooms. Each server only knows its own sockets,
 * so an emit to `user:<id>` on server A would miss a user connected to server B. With the
 * adapter, every emit is also published to Redis, and each server delivers it to the
 * matching sockets it holds. App code keeps calling `io.to(room).emit(...)` unchanged.
 *
 * Without REDIS_URL the app runs single-server, exactly as before (local dev needs no Redis).
 */
export async function attachRedisAdapter(io: SocketIOServer): Promise<boolean> {
  const url = process.env.REDIS_URL;
  if (!url) return false;

  // Two connections: a Redis connection in subscribe mode can't send other commands.
  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();
  // Without a listener, a dropped connection would crash the process; the client reconnects.
  pubClient.on("error", (error: Error) => console.error("[redis pub]", error.message));
  subClient.on("error", (error: Error) => console.error("[redis sub]", error.message));

  // Fails startup if Redis is unreachable — better than silently going single-server
  // behind a load balancer, where cross-server messages would quietly be lost.
  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));
  return true;
}
