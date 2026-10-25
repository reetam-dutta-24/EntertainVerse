import type { Server as SocketIOServer } from "socket.io";

/**
 * The live Socket.IO server, shared through globalThis. server.ts (run by tsx) creates it,
 * but API routes are bundled by Next and load their own copy of this module — a plain
 * module variable stayed null there, so DMs and chat edits/deletes never went out live.
 */
const globalForSocket = globalThis as unknown as { __entertainverseIo?: SocketIOServer };

export function setSocketServer(io: SocketIOServer) {
  globalForSocket.__entertainverseIo = io;
}

export function getSocketServer(): SocketIOServer | null {
  return globalForSocket.__entertainverseIo ?? null;
}
