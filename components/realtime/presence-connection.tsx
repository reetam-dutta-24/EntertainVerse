"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { getSocketUrl } from "@/lib/env/socket";

/**
 * Keeps one quiet socket open while you're anywhere in the app, so friends see you online
 * (not only while a chat or DM screen happens to be open). Renders nothing.
 */
export function PresenceConnection() {
  useEffect(() => {
    const socket = io(getSocketUrl(), { path: "/api/socket/io", withCredentials: true, transports: ["websocket", "polling"] });
    return () => {
      socket.disconnect();
    };
  }, []);
  return null;
}
