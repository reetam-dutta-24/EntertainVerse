"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Socket } from "socket.io-client";
import { DEFAULT_ICE_SERVERS, fetchIceServers } from "@/lib/realtime/ice-servers";
import type { PartyLiveKind, PartyState } from "@/lib/party/types";

type Signal = { type: "offer" | "answer"; sdp: string } | { type: "candidate"; candidate: RTCIceCandidateInit };

/**
 * Live hosting for a watch party, browser to browser: the host captures their screen or
 * camera and sends it to each viewer on its own RTCPeerConnection; viewers just receive.
 * Signalling rides the party's socket (live:* events).
 */
export function useLiveBroadcast({
  socketRef,
  partyKey,
  state,
  viewerUserId,
}: {
  socketRef: RefObject<Socket | null>;
  partyKey: string;
  state: PartyState | null;
  viewerUserId?: string;
}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const iceRef = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  /** Host: one connection per viewer socket. Viewer: one connection, keyed by the host's socket. */
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const live = state?.live ?? null;
  const broadcasting = Boolean(live && localStream && live.userId === viewerUserId);

  useEffect(() => {
    void fetchIceServers().then((servers) => {
      iceRef.current = servers;
    });
  }, []);

  const closeAll = useCallback(() => {
    for (const pc of peers.current.values()) pc.close();
    peers.current.clear();
    setViewerCount(0);
  }, []);

  const send = useCallback(
    (to: string, data: Signal) => socketRef.current?.emit("live:signal", { key: partyKey, to, data }),
    [socketRef, partyKey],
  );

  const newConnection = useCallback(
    (peerSocketId: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceRef.current });
      peers.current.set(peerSocketId, pc);
      pc.onicecandidate = (event) => {
        if (event.candidate) send(peerSocketId, { type: "candidate", candidate: event.candidate.toJSON() });
      };
      return pc;
    },
    [send],
  );

  /** Stop broadcasting (also when the browser's own "Stop sharing" is used). */
  const stop = useCallback(() => {
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    setLocalStream(null);
    closeAll();
    socketRef.current?.emit("live:stop", { key: partyKey });
  }, [closeAll, socketRef, partyKey]);

  const start = useCallback(
    async (kind: PartyLiveKind) => {
      setError(null);
      try {
        const stream =
          kind === "screen"
            ? await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true })
            : await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: { echoCancellation: true } });
        stream.getVideoTracks()[0]?.addEventListener("ended", stop);
        localRef.current = stream;
        setLocalStream(stream);
        socketRef.current?.emit("live:start", { key: partyKey, kind });
      } catch {
        setError(kind === "screen" ? "Screen sharing was cancelled or blocked." : "Camera access was blocked — allow it in your browser to go live.");
      }
    },
    [socketRef, partyKey, stop],
  );

  // Socket events for both roles.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Host: a viewer asked for the stream — send them an offer.
    const onViewer = async ({ viewerSocketId }: { viewerSocketId: string }) => {
      const stream = localRef.current;
      if (!stream) return;
      peers.current.get(viewerSocketId)?.close();
      const pc = newConnection(viewerSocketId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") peers.current.delete(viewerSocketId);
        setViewerCount([...peers.current.values()].filter((entry) => entry.connectionState === "connected").length);
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send(viewerSocketId, { type: "offer", sdp: offer.sdp ?? "" });
    };

    const onViewerLeft = ({ viewerSocketId }: { viewerSocketId: string }) => {
      peers.current.get(viewerSocketId)?.close();
      peers.current.delete(viewerSocketId);
      setViewerCount([...peers.current.values()].filter((entry) => entry.connectionState === "connected").length);
    };

    const onSignal = async ({ from, data }: { from: string; data: Signal }) => {
      if (data.type === "offer") {
        // Viewer: the host is calling.
        peers.current.get(from)?.close();
        const pc = newConnection(from);
        pc.ontrack = (event) => setRemoteStream(event.streams[0] ?? null);
        await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send(from, { type: "answer", sdp: answer.sdp ?? "" });
        return;
      }
      const pc = peers.current.get(from);
      if (!pc) return;
      if (data.type === "answer") await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
      else if (data.type === "candidate") await pc.addIceCandidate(data.candidate).catch(() => undefined);
    };

    const onEnded = () => {
      closeAll();
      setRemoteStream(null);
    };

    socket.on("live:viewer", onViewer);
    socket.on("live:viewer-left", onViewerLeft);
    socket.on("live:signal", onSignal);
    socket.on("live:ended", onEnded);
    return () => {
      socket.off("live:viewer", onViewer);
      socket.off("live:viewer-left", onViewerLeft);
      socket.off("live:signal", onSignal);
      socket.off("live:ended", onEnded);
    };
  }, [socketRef, state?.key, newConnection, send, closeAll]);

  // Viewer: ask for each new broadcast (and again after reconnecting).
  const liveId = live && live.userId !== viewerUserId ? live.startedAt : null;
  useEffect(() => {
    const socket = socketRef.current;
    if (!liveId || !socket) return;
    const request = () => socket.emit("live:request", { key: partyKey });
    request();
    socket.on("connect", request);
    return () => {
      socket.off("connect", request);
    };
  }, [liveId, socketRef, partyKey]);

  // Leaving the party ends your broadcast and releases the camera / screen.
  useEffect(
    () => () => {
      localRef.current?.getTracks().forEach((track) => track.stop());
      for (const pc of peers.current.values()) pc.close();
    },
    [],
  );

  return { live, localStream, remoteStream: live ? remoteStream : null, broadcasting, viewerCount, error, start, stop };
}
