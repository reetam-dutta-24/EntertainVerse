"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Headphones, LoaderCircle, LocateFixed, MessageCircle, MessagesSquare, Mic, Radio, Settings2, Sparkles, Tv, UserMinus, Users } from "lucide-react";
import { useConfirm, useToast } from "@/components/feedback/feedback-provider";
import { useAppRouter } from "@/hooks/use-app-router";
import { getCommunityDashboardPath, getCommunityDetailPath } from "@/lib/community-routes";
import { getProfilePath } from "@/lib/profile-routes";
import { MATCH_SCOPES, type MatchProfileView, type MatchScope, type RoomInvite, type RoomView } from "@/lib/match/types";
import { cn } from "@/lib/utils";
import { ProfileLink } from "@/components/profile/profile-link";

const COUNTRY_CODES = ["IN", "US", "GB", "CA", "AU", "JP", "KR", "SG", "AE", "DE", "FR", "ES", "IT", "BR", "MX", "ID", "PH", "MY", "TH", "VN", "NL", "SE", "PK", "BD", "NP", "LK", "NZ", "ZA", "NG", "EG"];

function regionFromLocale() {
  try {
    return new Intl.Locale(navigator.language).maximize().region ?? "IN";
  } catch {
    return "IN";
  }
}

/** Pass `handle` to make it open that user's profile. */
export function Avatar({ name, color, url, size = "size-10", handle }: { name: string; color: string; url?: string; size?: string; handle?: string }) {
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <ProfileLink handle={handle} name={name}>
      <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface text-sm font-bold text-white", size)} style={{ backgroundColor: color }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" className="size-full object-cover" /> : initials}
      </span>
    </ProfileLink>
  );
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

/** Room spaces: where each part of the room lives in its private community. */
export const ROOM_SPACES = [
  { section: "chat", label: "Group chat", icon: MessagesSquare },
  { section: "watch-channel", label: "Watch party", icon: Tv },
  { section: "listen-party", label: "Listen party", icon: Headphones },
  { section: "voice-channel", label: "Talk room", icon: Mic },
] as const;

export interface MatchExperienceProps {
  initialProfile: MatchProfileView | null;
  initialRooms: RoomView[];
  initialInvites: RoomInvite[];
  suggestion: { title: string; vibe: string };
}

/** AI Match rooms: open a room and everyone who matches you is invited; or join one in a tap. */
export function MatchExperience({ initialProfile, initialRooms, initialInvites, suggestion }: MatchExperienceProps) {
  const router = useAppRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [rooms, setRooms] = useState(initialRooms);
  const [invites, setInvites] = useState(initialInvites);
  const [editing, setEditing] = useState(!initialProfile);
  const [settingsScope, setSettingsScope] = useState<MatchScope>(initialProfile?.scope ?? "country");
  const [country, setCountry] = useState(initialProfile?.country ?? "");
  const [intro, setIntro] = useState(initialProfile?.intro ?? "");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [roomTitle, setRoomTitle] = useState(suggestion.title);
  const [roomTopic, setRoomTopic] = useState("");
  const [roomScope, setRoomScope] = useState<MatchScope>(initialProfile?.scope ?? "country");
  const [capacity, setCapacity] = useState(6);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmAction = useConfirm();
  const toast = useToast();

  const countryOptions = useMemo(() => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  function locate() {
    if (!navigator.geolocation) return setError("Location isn't available in this browser — pick your country instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Rounded on the device too: only ~10 km precision ever leaves it.
        setCoords({ latitude: Math.round(position.coords.latitude * 10) / 10, longitude: Math.round(position.coords.longitude * 10) / 10 });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location — use My country or Worldwide instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 3_600_000 },
    );
  }

  async function saveProfile() {
    setBusy("profile");
    setError(null);
    try {
      const data = await api<{ profile: MatchProfileView }>("/api/match/profile", {
        method: "PUT",
        body: JSON.stringify({ enabled: true, scope: settingsScope, country: country || (profile?.country ?? regionFromLocale()), intro, groupSize: 4, ...(coords ?? {}) }),
      });
      setProfile(data.profile);
      setRoomScope(data.profile.scope);
      setEditing(false);
      toast(profile ? "AI Match settings saved." : "You're in — you'll get a popup when someone opens a room that matches you.", "success");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Couldn't save.");
    } finally {
      setBusy(null);
    }
  }

  async function stopMatching() {
    const confirmed = await confirmAction({
      title: "Stop AI Match?",
      description: "You won't be invited to rooms any more and your location is forgotten. Rooms you're in stay.",
      confirmLabel: "Stop matching",
      destructive: true,
    });
    if (!confirmed) return;
    await api("/api/match/profile", { method: "DELETE" }).catch(() => undefined);
    setProfile(null);
    setEditing(true);
  }

  async function openRoom() {
    setBusy("create");
    setError(null);
    try {
      const data = await api<{ result: { invited: number; mode: string; communitySlug: string }; rooms: RoomView[] }>("/api/match/rooms", {
        method: "POST",
        body: JSON.stringify({ title: roomTitle, topic: roomTopic || undefined, scope: roomScope, capacity }),
      });
      setRooms(data.rooms);
      setRoomTopic("");
      const { invited, mode } = data.result;
      toast(
        mode === "none"
          ? "Room opened — nobody else matches yet. Invites go out as people join AI Match."
          : mode === "strong"
            ? `Room opened — ${invited} strong match${invited === 1 ? "" : "es"} just got a popup.`
            : `Room opened — invited the ${invited} closest match${invited === 1 ? "" : "es"} we have right now.`,
        "success",
      );
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Couldn't open the room.");
    } finally {
      setBusy(null);
    }
  }

  async function act(roomId: string, action: "join" | "decline" | "leave") {
    if (action === "leave") {
      const confirmed = await confirmAction({ title: "Leave this room?", description: "You'll leave its chat and parties.", confirmLabel: "Leave room", destructive: true });
      if (!confirmed) return;
    }
    setBusy(roomId);
    try {
      const data = await api<{ rooms: RoomView[]; invites: RoomInvite[] }>(`/api/match/rooms/${roomId}`, { method: "PATCH", body: JSON.stringify({ action }) });
      setRooms(data.rooms);
      setInvites(data.invites);
      if (action === "join") {
        const room = data.rooms.find((entry) => entry.id === roomId);
        toast("You're in! Say hi to the room.", "success");
        if (room?.communitySlug) router.push(getCommunityDashboardPath(room.communitySlug, "chat"));
      }
    } catch (actError) {
      toast(actError instanceof Error ? actError.message : "Couldn't update.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function sayHi(room: RoomView, handle: string, name: string) {
    try {
      await api("/api/dm/send", {
        method: "POST",
        body: JSON.stringify({ recipientHandle: handle, content: `👋 Hey ${name.split(" ")[0]}! We're both in “${room.title}” on AniVerse.` }),
      });
      toast(`Said hi to ${name} — continue in Messages.`, "success");
    } catch (dmError) {
      toast(dmError instanceof Error ? dmError.message : "Couldn't send.", "error");
    }
  }

  const scopeButtons = (value: MatchScope, onChange: (scope: MatchScope) => void, label: string) => (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-3">
      {MATCH_SCOPES.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn("flex cursor-pointer flex-col gap-1 rounded-2xl border p-3 text-left transition-colors", value === option.id ? "border-brand-magenta bg-brand-magenta/15" : "border-white/10 hover:border-white/25")}
        >
          <span className="text-sm font-semibold text-white">
            {option.emoji} {option.label}
          </span>
          <span className="text-caption text-white/55">{option.hint}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <section className="flex flex-col gap-3 rounded-3xl border border-brand-magenta/25 bg-gradient-to-br from-brand-purple/25 via-surface to-surface p-4 shadow-card-inner sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-pink">
            <Users className="size-5 text-white" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white sm:text-xl">AI Match rooms</h1>
            <p className="mt-0.5 text-sm text-white/65">
              Open a room and everyone who shares your taste and personality gets invited. Watch parties, listen parties,
              talk rooms and chat — with people who actually like what you like.
            </p>
          </div>
        </div>
        {profile && !editing ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setEditing(true)} className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10 sm:w-auto">
              <Settings2 className="size-4" aria-hidden /> Settings
            </button>
            <button type="button" onClick={() => void stopMatching()} className="inline-flex w-full cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm text-white/55 hover:text-white sm:w-auto">
              Stop matching
            </button>
          </div>
        ) : null}
      </section>

      {editing ? (
        <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <div>
            <h2 className="text-base font-bold text-white">{profile ? "AI Match settings" : "Turn on AI Match"}</h2>
            <p className="mt-1 text-xs text-white/55">
              Turn it on to get room invites (at most 5 popups a day) and to open rooms. Your location is rounded to about
              10 km and only shown as &ldquo;~15 km away&rdquo;.
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Invite me to rooms from</p>
          {scopeButtons(settingsScope, setSettingsScope, "Invite me to rooms from")}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-white/60">
              Country
              <select value={country} onChange={(event) => setCountry(event.target.value)} className="h-11 rounded-xl border border-white/15 bg-popover px-3 text-sm text-white">
                <option value="">Detect from my browser</option>
                {countryOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5 text-xs text-white/60">
              Approximate location {settingsScope === "nearby" ? "(needed for Nearby)" : "(optional)"}
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className={cn("inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm", coords || profile?.hasLocation ? "border-emerald-400/40 text-emerald-100" : "border-white/15 text-white/80 hover:bg-white/10")}
              >
                {locating ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />}
                {coords ? "Location set (~10 km)" : profile?.hasLocation ? "Location saved — update" : "Use my approximate location"}
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-xs text-white/60">
            One line about you (shown in rooms)
            <input value={intro} onChange={(event) => setIntro(event.target.value)} maxLength={160} placeholder="e.g. Late-night anime binger, always up for a Ghibli rewatch" className="h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none" />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={busy === "profile" || (settingsScope === "nearby" && !coords && !profile?.hasLocation)}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {busy === "profile" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              {profile ? "Save settings" : "Turn on AI Match"}
            </button>
            {profile ? (
              <button type="button" onClick={() => setEditing(false)} className="inline-flex w-full cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm text-white/60 hover:text-white sm:w-auto">
                Cancel
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {invites.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-white sm:text-lg">💌 Rooms that match you</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {invites.map((invite) => (
              <li key={invite.roomId} className={cn("flex flex-col gap-3 rounded-2xl border border-brand-magenta/30 bg-surface/70 p-4", busy === invite.roomId && "animate-pulse")}>
                <div className="flex items-start gap-3">
                  <Avatar name={invite.creatorName} color={invite.creatorAvatarColor} url={invite.creatorAvatarUrl} handle={invite.creatorHandle} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{invite.headline}</p>
                    <p className="mt-0.5 text-caption text-brand-pink">{invite.vibe}</p>
                    {invite.topic ? <p className="text-caption text-white/70">“{invite.topic}”</p> : null}
                    <p className="mt-1 text-caption text-white/55">Why you: {invite.reason}</p>
                  </div>
                </div>
                <p className="text-caption text-white/50">
                  {invite.joinedCount}/{invite.capacity} spots taken
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={busy === invite.roomId} onClick={() => void act(invite.roomId, "join")} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white">
                    <Check className="size-4" aria-hidden /> Join the room
                  </button>
                  <button type="button" disabled={busy === invite.roomId} onClick={() => void act(invite.roomId, "decline")} className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/10">
                    Not for me
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile && !editing ? (
        <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Radio className="size-4 text-brand-pink" aria-hidden /> Open an AI room
            </h2>
            <p className="mt-1 text-xs text-white/55">
              Everyone opted in within your reach who matches you 60%+ gets a popup and a notification (while AniVerse is
              small, the closest matches we have). First come, first in.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-white/60">
              Room name
              <input value={roomTitle} onChange={(event) => setRoomTitle(event.target.value)} maxLength={60} className="h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-brand-magenta focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/60">
              What&apos;s it for? (optional)
              <input value={roomTopic} onChange={(event) => setRoomTopic(event.target.value)} maxLength={120} placeholder="e.g. Death Note rewatch tonight · lo-fi study session" className="h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none" />
            </label>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Invite people from</p>
          {scopeButtons(roomScope, setRoomScope, "Invite people from")}
          <div className="flex flex-col gap-1.5 text-xs text-white/60">
            Room size (including you)
            <div role="radiogroup" aria-label="Room size" className="flex flex-wrap gap-2">
              {[3, 4, 6, 8, 10, 12].map((size) => (
                <button key={size} type="button" role="radio" aria-checked={capacity === size} onClick={() => setCapacity(size)} className={cn("h-10 w-12 cursor-pointer rounded-xl border text-sm font-semibold", capacity === size ? "border-brand-magenta bg-brand-magenta/15 text-white" : "border-white/10 text-white/70")}>
                  {size}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-sm text-amber-100">{error}</p> : null}
          <button
            type="button"
            onClick={() => void openRoom()}
            disabled={busy === "create" || roomTitle.trim().length < 2 || (roomScope === "nearby" && !profile.hasLocation)}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:self-start"
          >
            {busy === "create" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            Open room &amp; invite my matches
          </button>
          {roomScope === "nearby" && !profile.hasLocation ? <p className="text-caption text-white/50">Nearby rooms need your approximate location — add it in Settings.</p> : null}
        </section>
      ) : null}

      {rooms.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-white sm:text-lg">👥 Your rooms</h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {rooms.map((room) => (
              <li key={room.id} className={cn("flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/70 p-4", busy === room.id && "animate-pulse")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{room.title}</p>
                    <p className="text-sm text-brand-pink">{room.vibe}</p>
                    {room.topic ? <p className="text-caption text-white/65">“{room.topic}”</p> : null}
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-micro font-semibold", room.status === "OPEN" ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/60")}>
                    {room.members.length}/{room.capacity} · {room.status === "OPEN" ? "Open" : "Full"}
                  </span>
                </div>
                {room.createdByMe ? <p className="text-caption text-white/45">Invited {room.invitedCount} matching {room.invitedCount === 1 ? "person" : "people"}.</p> : null}
                <ul className="flex flex-col gap-1.5">
                  {room.members.map((member) => (
                    <li key={member.userId} className="flex items-center gap-2.5">
                      <Avatar name={member.name} color={member.avatarColor} url={member.avatarUrl} size="size-8" handle={member.handle} />
                      <div className="min-w-0 flex-1">
                        <Link href={getProfilePath(member.handle)} className="truncate text-sm text-white hover:text-brand-pink">
                          {member.isMe ? "You" : member.name}
                          {member.isHost ? <span className="ms-1.5 text-micro text-brand-pink">host</span> : null}
                        </Link>
                        {!member.isHost ? <p className="truncate text-caption text-white/45">{member.matchScore}% · {member.reason}</p> : null}
                      </div>
                      {!member.isMe ? (
                        <button type="button" onClick={() => void sayHi(room, member.handle, member.name)} className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-caption text-white/80 hover:bg-white/10">
                          <MessageCircle className="size-3.5" aria-hidden /> DM
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {room.communitySlug ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ROOM_SPACES.map(({ section, label, icon: Icon }) => (
                      <Link key={section} href={`${getCommunityDetailPath(room.communitySlug!)}/dashboard/${section}`} className="inline-flex flex-col items-center gap-1 rounded-xl bg-white/[0.06] px-2 py-2 text-caption text-white hover:bg-white/10">
                        <Icon className="size-4 text-brand-pink" aria-hidden /> {label}
                      </Link>
                    ))}
                  </div>
                ) : null}
                <button type="button" onClick={() => void act(room.id, "leave")} className="inline-flex w-fit cursor-pointer items-center gap-1 text-caption text-white/45 hover:text-white">
                  <UserMinus className="size-3.5" aria-hidden /> Leave room
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
