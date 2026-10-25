"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { io, type Socket } from "socket.io-client";
import { LoaderCircle, Mic, MicOff, PhoneOff } from "lucide-react";
import { getSocketUrl } from "@/lib/env/socket";
import { VOICE_ROOM_LIMIT, type VoicePeer } from "@/lib/party/types";
import { cn } from "@/lib/utils";
import { ProfileLink } from "@/components/profile/profile-link";

/** Free public STUN servers — enough for most home and mobile networks (no TURN relay). */
const ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

type Signal = { type: "offer" | "answer"; sdp: string } | { type: "candidate"; candidate: RTCIceCandidateInit };

interface PeerView extends VoicePeer {
  muted: boolean;
  speaking: boolean;
  connected: boolean;
}

/** Watch a stream's volume and report when someone is talking. */
function watchSpeaking(stream: MediaStream, onChange: (speaking: boolean) => void) {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  context.createMediaStreamSource(stream).connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  let speaking = false;
  const timer = window.setInterval(() => {
    analyser.getByteFrequencyData(data);
    const level = data.reduce((sum, value) => sum + value, 0) / data.length;
    const next = level > 18;
    if (next !== speaking) {
      speaking = next;
      onChange(next);
    }
  }, 200);
  return () => {
    window.clearInterval(timer);
    void context.close();
  };
}

export interface TalkRoomProps {
  channelId: string;
  channelTitle: string;
  onClose: () => void;
}

/** Live voice for a community voice channel — browser-to-browser audio (WebRTC mesh). */
export function TalkRoom({ channelId, channelTitle, onClose }: TalkRoomProps) {
  const [status, setStatus] = useState<"asking" | "connecting" | "live" | "error">("asking");
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<Record<string, PeerView>>({});
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const connections = useRef(new Map<string, RTCPeerConnection>());
  const audioEls = useRef(new Map<string, HTMLAudioElement>());
  const stopWatchers = useRef(new Map<string, () => void>());

  useEffect(() => {
    let cancelled = false;
    const updatePeer = (socketId: string, patch: Partial<PeerView>) =>
      setPeers((current) => (current[socketId] ? { ...current, [socketId]: { ...current[socketId]!, ...patch } } : current));

    const closePeer = (socketId: string) => {
      connections.current.get(socketId)?.close();
      connections.current.delete(socketId);
      audioEls.current.get(socketId)?.remove();
      audioEls.current.delete(socketId);
      stopWatchers.current.get(socketId)?.();
      stopWatchers.current.delete(socketId);
      setPeers((current) => {
        const next = { ...current };
        delete next[socketId];
        return next;
      });
    };

    const createConnection = (peer: VoicePeer) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      connections.current.set(peer.socketId, pc);
      localStream.current?.getTracks().forEach((track) => pc.addTrack(track, localStream.current!));
      pc.onicecandidate = (event) => {
        if (event.candidate) socketRef.current?.emit("voice:signal", { to: peer.socketId, channelId, data: { type: "candidate", candidate: event.candidate.toJSON() } satisfies Signal });
      };
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        let audio = audioEls.current.get(peer.socketId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioEls.current.set(peer.socketId, audio);
        }
        audio.srcObject = stream;
        void audio.play().catch(() => undefined);
        stopWatchers.current.get(peer.socketId)?.();
        stopWatchers.current.set(peer.socketId, watchSpeaking(stream, (value) => updatePeer(peer.socketId, { speaking: value })));
      };
      pc.onconnectionstatechange = () => {
        updatePeer(peer.socketId, { connected: pc.connectionState === "connected" });
        if (pc.connectionState === "failed") closePeer(peer.socketId);
      };
      return pc;
    };

    const addPeer = (peer: VoicePeer) =>
      setPeers((current) => ({ ...current, [peer.socketId]: { ...peer, muted: false, speaking: false, connected: false } }));

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (cancelled) return stream.getTracks().forEach((track) => track.stop());
        localStream.current = stream;
        stopWatchers.current.set("me", watchSpeaking(stream, (value) => {
          setSpeaking(value);
          socketRef.current?.emit("voice:state", { channelId, speaking: value, muted: !stream.getAudioTracks()[0]?.enabled });
        }));
      } catch {
        setStatus("error");
        setError("Microphone access was blocked — allow it in your browser to join the talk room.");
        return;
      }

      setStatus("connecting");
      const socket = io(getSocketUrl(), { path: "/api/socket/io", withCredentials: true, transports: ["websocket", "polling"] });
      socketRef.current = socket;
      socket.on("connect", () => socket.emit("voice:join", { channelId }));
      socket.on("connect_error", () => {
        setStatus("error");
        setError("Can't reach the live server — is `npm run dev` running?");
      });
      socket.on("voice:error", ({ message }: { message: string }) => {
        setStatus("error");
        setError(message);
      });
      // We're the newcomer: call everyone already in the room.
      socket.on("voice:peers", async ({ peers: existing }: { peers: VoicePeer[] }) => {
        setStatus("live");
        for (const peer of existing) {
          addPeer(peer);
          const pc = createConnection(peer);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("voice:signal", { to: peer.socketId, channelId, data: { type: "offer", sdp: offer.sdp ?? "" } satisfies Signal });
        }
      });
      socket.on("voice:peer-joined", (peer: VoicePeer) => addPeer(peer));
      socket.on("voice:peer-left", ({ socketId }: { socketId: string }) => closePeer(socketId));
      socket.on("voice:state", ({ socketId, muted: peerMuted, speaking: peerSpeaking }: { socketId: string; muted: boolean; speaking: boolean }) =>
        updatePeer(socketId, { muted: peerMuted, speaking: peerSpeaking && !peerMuted }),
      );
      socket.on("voice:signal", async ({ from, data }: { from: string; data: Signal }) => {
        let pc = connections.current.get(from);
        if (data.type === "offer") {
          pc ??= createConnection({ socketId: from, userId: "", name: "", avatarColor: "#ff00cc" });
          await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("voice:signal", { to: from, channelId, data: { type: "answer", sdp: answer.sdp ?? "" } satisfies Signal });
        } else if (data.type === "answer" && pc) {
          await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
        } else if (data.type === "candidate" && pc) {
          await pc.addIceCandidate(data.candidate).catch(() => undefined);
        }
      });
    })();

    const watchers = stopWatchers.current;
    const peerConnections = connections.current;
    const elements = audioEls.current;
    return () => {
      cancelled = true;
      socketRef.current?.emit("voice:leave", { channelId });
      socketRef.current?.disconnect();
      peerConnections.forEach((pc) => pc.close());
      peerConnections.clear();
      elements.forEach((audio) => audio.remove());
      elements.clear();
      watchers.forEach((stop) => stop());
      watchers.clear();
      localStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [channelId]);

  function toggleMute() {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = muted;
    setMuted(!muted);
    socketRef.current?.emit("voice:state", { channelId, muted: !muted, speaking: false });
  }

  const people = Object.values(peers);

  // Portalled to <body> so the overlay covers the screen and scrolls (see WatchParty).
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Talk room: ${channelTitle}`} className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur sm:items-center">
      <div className="my-auto flex w-full max-w-2xl flex-col gap-5 rounded-3xl border border-brand-magenta/30 bg-gradient-to-br from-brand-purple/30 via-surface to-surface p-5 shadow-card-inner sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-brand-pink">
              <Mic className="size-3.5" aria-hidden /> Talk room · {people.length + 1}/{VOICE_ROOM_LIMIT}
            </p>
            <h2 className="text-lg font-bold text-white">{channelTitle}</h2>
          </div>
          {status === "connecting" || status === "asking" ? <LoaderCircle className="size-5 animate-spin text-brand-pink" aria-label="Connecting" /> : null}
        </div>

        {status === "error" ? (
          <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{error}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
            <li className="flex flex-col items-center gap-2 rounded-2xl bg-black/30 p-3">
              <span className={cn("flex size-16 items-center justify-center rounded-full bg-gradient-brand text-lg font-bold text-white transition-shadow", speaking && !muted && "ring-4 ring-emerald-400/80")}>You</span>
              <span className="flex items-center gap-1 text-caption text-white/80">{muted ? <MicOff className="size-3.5 text-red-300" aria-label="Muted" /> : null} You</span>
            </li>
            {people.map((peer) => (
              <li key={peer.socketId} className="flex flex-col items-center gap-2 rounded-2xl bg-black/30 p-3">
                <ProfileLink handle={peer.userId} name={peer.name || "this speaker"} newTab>
                  <span className={cn("flex size-16 items-center justify-center rounded-full text-lg font-bold text-white transition-shadow", peer.speaking && "ring-4 ring-emerald-400/80", !peer.connected && "opacity-60")} style={{ backgroundColor: peer.avatarColor }}>
                    {(peer.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                </ProfileLink>
                <span className="flex max-w-full items-center gap-1 truncate text-caption text-white/80">
                  {peer.muted ? <MicOff className="size-3.5 shrink-0 text-red-300" aria-label="Muted" /> : null}
                  <span className="truncate">{peer.name || "Joining…"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {status !== "error" ? (
            <button type="button" onClick={toggleMute} className={cn("inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold sm:w-auto", muted ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white hover:bg-white/15")}>
              {muted ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
              {muted ? "Unmute" : "Mute"}
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-red-500/80 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 sm:w-auto">
            <PhoneOff className="size-4" aria-hidden /> Leave
          </button>
          <p className="text-caption text-white/40 sm:ms-auto">Peer-to-peer audio · works on most networks</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
