"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getSocketUrl } from "@/lib/env/socket";
import type { PartyChatMessage, PartyControl, PartyState } from "@/lib/party/types";

export interface PartyReaction {
  id: number;
  emoji: string;
}

/** Opens a socket for one party (watch / listen) and keeps its live state. */
export function useParty(key: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<PartyState | null>(null);
  const [chat, setChat] = useState<PartyChatMessage[]>([]);
  const [reactions, setReactions] = useState<PartyReaction[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** server clock − device clock, so everyone computes the same position. */
  const skewRef = useRef(0);

  useEffect(() => {
    if (!key) return;
    const socket = io(getSocketUrl(), { path: "/api/socket/io", withCredentials: true, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      setError(null);
      socket.emit("party:join", { key });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setError("Can't reach the live server — is `npm run dev` running?"));
    socket.on("party:state", (next: PartyState) => {
      skewRef.current = next.serverNow - Date.now();
      setState(next);
    });
    socket.on("party:chat", (message: PartyChatMessage) => setChat((current) => [...current.slice(-79), message]));
    socket.on("party:reaction", ({ emoji }: { emoji: string }) => {
      const id = Date.now() + Math.random();
      setReactions((current) => [...current.slice(-14), { id, emoji }]);
      window.setTimeout(() => setReactions((current) => current.filter((reaction) => reaction.id !== id)), 2600);
    });
    socket.on("party:error", ({ message }: { message: string }) => setError(message));
    return () => {
      socket.emit("party:leave", { key });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [key]);

  const control = useCallback((next: PartyControl) => socketRef.current?.emit("party:control", { key, control: next }), [key]);
  const sendChat = useCallback((text: string) => socketRef.current?.emit("party:chat", { key, text }), [key]);
  const react = useCallback((emoji: string) => socketRef.current?.emit("party:reaction", { key, emoji }), [key]);

  return { state, chat, reactions, connected, error, skewMs: skewRef, control, sendChat, react, socketRef };
}
