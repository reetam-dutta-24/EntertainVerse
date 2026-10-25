"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, LocateFixed, MessageCircle, MessagesSquare, Mic, Settings2, Sparkles, Tv, UserMinus, Users, X } from "lucide-react";
import { useConfirm, useToast } from "@/components/feedback/feedback-provider";
import { getCommunityDashboardPath } from "@/lib/community-routes";
import { getProfilePath } from "@/lib/profile-routes";
import { MATCH_SCOPES, type CircleProposal, type CircleView, type MatchProfileView, type MatchScope } from "@/lib/match/types";
import { cn } from "@/lib/utils";

const COUNTRY_CODES = ["IN", "US", "GB", "CA", "AU", "JP", "KR", "SG", "AE", "DE", "FR", "ES", "IT", "BR", "MX", "ID", "PH", "MY", "TH", "VN", "NL", "SE", "PK", "BD", "NP", "LK", "NZ", "ZA", "NG", "EG"];

function regionFromLocale() {
  try {
    return new Intl.Locale(navigator.language).maximize().region ?? "IN";
  } catch {
    return "IN";
  }
}

function Avatar({ name, color, url, size = "size-10" }: { name: string; color: string; url?: string; size?: string }) {
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white", size)} style={{ backgroundColor: color }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className="size-full object-cover" /> : initials}
    </span>
  );
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

export interface MatchExperienceProps {
  initialProfile: MatchProfileView | null;
  initialCircles: CircleView[];
}

/** AI Match: opt in, get matched into a small circle of people like you, then hang out. */
export function MatchExperience({ initialProfile, initialCircles }: MatchExperienceProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [circles, setCircles] = useState(initialCircles);
  const [editing, setEditing] = useState(!initialProfile);
  const [scope, setScope] = useState<MatchScope>(initialProfile?.scope ?? "country");
  const [country, setCountry] = useState(initialProfile?.country ?? "");
  const [intro, setIntro] = useState(initialProfile?.intro ?? "");
  const [groupSize, setGroupSize] = useState(initialProfile?.groupSize ?? 4);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [proposal, setProposal] = useState<CircleProposal | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmAction = useConfirm();
  const toast = useToast();

  const countryOptions = useMemo(() => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);
  const invitations = circles.filter((circle) => circle.myStatus === "INVITED");
  const mine = circles.filter((circle) => circle.myStatus === "ACCEPTED");

  function locate() {
    if (!navigator.geolocation) return setError("Location isn't available in this browser — pick your country instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Rounded here too: only ~10 km precision ever leaves the device.
        setCoords({ latitude: Math.round(position.coords.latitude * 10) / 10, longitude: Math.round(position.coords.longitude * 10) / 10 });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location — pick My country or Worldwide instead.");
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
        body: JSON.stringify({
          enabled: true,
          scope,
          country: country || (profile?.country ?? regionFromLocale()),
          intro,
          groupSize,
          ...(coords ? coords : {}),
        }),
      });
      setProfile(data.profile);
      setEditing(false);
      toast(profile ? "AI Match settings saved." : "You're in — let's find your people.", "success");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Couldn't save.");
    } finally {
      setBusy(null);
    }
  }

  async function stopMatching() {
    const confirmed = await confirmAction({
      title: "Stop AI Match?",
      description: "You won't be matched or invited any more and your location is forgotten. Circles you already joined stay.",
      confirmLabel: "Stop matching",
      destructive: true,
    });
    if (!confirmed) return;
    await api("/api/match/profile", { method: "DELETE" }).catch(() => undefined);
    setProfile(null);
    setProposal(null);
    setEditing(true);
  }

  async function findCircle(exclude = removed) {
    setBusy("propose");
    setError(null);
    try {
      const data = await api<{ proposal: CircleProposal }>("/api/match/propose", { method: "POST", body: JSON.stringify({ exclude }) });
      setProposal(data.proposal);
    } catch (proposeError) {
      setProposal(null);
      setError(proposeError instanceof Error ? proposeError.message : "Couldn't find matches.");
    } finally {
      setBusy(null);
    }
  }

  async function invite() {
    if (!proposal) return;
    setBusy("invite");
    try {
      const data = await api<{ circles: CircleView[] }>("/api/match/circles", {
        method: "POST",
        body: JSON.stringify({ title: proposal.title, vibe: proposal.vibe, memberIds: proposal.members.map((member) => member.userId) }),
      });
      setCircles(data.circles);
      setProposal(null);
      setRemoved([]);
      toast("Invites sent — the circle opens as soon as someone accepts.", "success");
    } catch (inviteError) {
      toast(inviteError instanceof Error ? inviteError.message : "Couldn't invite.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function respond(circle: CircleView, action: "accept" | "decline" | "leave") {
    if (action === "leave") {
      const confirmed = await confirmAction({ title: `Leave “${circle.title}”?`, description: "You'll leave its chat and rooms.", confirmLabel: "Leave circle", destructive: true });
      if (!confirmed) return;
    }
    setBusy(circle.id);
    try {
      const data = await api<{ circles: CircleView[] }>(`/api/match/circles/${circle.id}`, { method: "PATCH", body: JSON.stringify({ action }) });
      setCircles(data.circles);
      if (action === "accept") toast(`You joined “${circle.title}”.`, "success");
    } catch (respondError) {
      toast(respondError instanceof Error ? respondError.message : "Couldn't update.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function sayHi(circle: CircleView, handle: string, name: string) {
    try {
      await api("/api/dm/send", {
        method: "POST",
        body: JSON.stringify({ recipientHandle: handle, content: `👋 Hey ${name.split(" ")[0]}! We matched in “${circle.title}” on AniVerse.` }),
      });
      toast(`Said hi to ${name} — continue in Messages.`, "success");
    } catch (dmError) {
      toast(dmError instanceof Error ? dmError.message : "Couldn't send.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <section className="flex flex-col gap-3 rounded-3xl border border-brand-magenta/25 bg-gradient-to-br from-brand-purple/25 via-surface to-surface p-4 shadow-card-inner sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-pink">
            <Users className="size-5 text-white" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white sm:text-xl">AI Match — find your people</h1>
            <p className="mt-0.5 text-sm text-white/65">
              Get grouped with people who share your taste and personality, nearby or anywhere. Chat, share what you&apos;re
              watching and set up rooms together.
            </p>
          </div>
        </div>
        {profile && !editing ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setEditing(true)} className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10 sm:w-auto">
              <Settings2 className="size-4" aria-hidden /> Settings
            </button>
            <button type="button" onClick={() => void stopMatching()} className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm text-white/55 hover:text-white sm:w-auto">
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
              Only people who turned this on can be matched. Your location is rounded to about 10 km and only shown as
              &ldquo;~15 km away&rdquo; — never exactly.
            </p>
          </div>
          <div role="radiogroup" aria-label="Match with" className="grid gap-2 sm:grid-cols-3">
            {MATCH_SCOPES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={scope === option.id}
                onClick={() => setScope(option.id)}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-2xl border p-3 text-left transition-colors",
                  scope === option.id ? "border-brand-magenta bg-brand-magenta/15" : "border-white/10 hover:border-white/25",
                )}
              >
                <span className="text-sm font-semibold text-white">
                  {option.emoji} {option.label}
                </span>
                <span className="text-caption text-white/55">{option.hint}</span>
              </button>
            ))}
          </div>
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
              Approximate location {scope === "nearby" ? "(needed for Nearby)" : "(optional)"}
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className={cn(
                  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm",
                  coords || profile?.hasLocation ? "border-emerald-400/40 text-emerald-100" : "border-white/15 text-white/80 hover:bg-white/10",
                )}
              >
                {locating ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />}
                {coords ? "Location set (~10 km)" : profile?.hasLocation ? "Location saved — update" : "Use my approximate location"}
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-xs text-white/60">
            One line about you (shown to your circle)
            <input
              value={intro}
              onChange={(event) => setIntro(event.target.value)}
              maxLength={160}
              placeholder="e.g. Late-night anime binger, always up for a Ghibli rewatch"
              className="h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none"
            />
          </label>
          <div className="flex flex-col gap-1.5 text-xs text-white/60">
            Circle size (including you)
            <div role="radiogroup" aria-label="Circle size" className="flex gap-2">
              {[3, 4, 5, 6].map((size) => (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={groupSize === size}
                  onClick={() => setGroupSize(size)}
                  className={cn("h-10 w-12 cursor-pointer rounded-xl border text-sm font-semibold", groupSize === size ? "border-brand-magenta bg-brand-magenta/15 text-white" : "border-white/10 text-white/70")}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={busy === "profile" || (scope === "nearby" && !coords && !profile?.hasLocation)}
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

      {profile && !editing ? (
        <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-white">✨ Find my circle</h2>
              <p className="mt-1 text-xs text-white/55">
                {MATCH_SCOPES.find((option) => option.id === profile.scope)?.label} · circles of {profile.groupSize} · matched on taste,
                favorites, artists and personality
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRemoved([]);
                void findCircle([]);
              }}
              disabled={busy === "propose"}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
            >
              {busy === "propose" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              {proposal ? "Find another circle" : "Find my circle"}
            </button>
          </div>
          {error ? <p className="text-sm text-amber-100">{error}</p> : null}
          {proposal ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-brand-magenta/25 bg-black/25 p-4">
              <div>
                <p className="text-lg font-bold text-white">{proposal.title}</p>
                <p className="text-sm text-brand-pink">{proposal.vibe}</p>
              </div>
              <ul className="grid gap-2 md:grid-cols-2">
                {proposal.members.map((member) => (
                  <li key={member.userId} className="flex gap-3 rounded-2xl border border-white/10 bg-surface/70 p-3">
                    <Avatar name={member.name} color={member.avatarColor} url={member.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={getProfilePath(member.handle)} className="truncate text-sm font-semibold text-white hover:text-brand-pink">
                          {member.name}
                        </Link>
                        <span className="shrink-0 rounded-full bg-brand-magenta/15 px-2 py-0.5 text-micro font-semibold text-brand-pink">{member.matchScore}% match</span>
                      </div>
                      <p className="text-caption text-white/50">@{member.handle} · {member.distanceLabel}</p>
                      {member.intro ? <p className="mt-1 line-clamp-2 text-caption text-white/70">“{member.intro}”</p> : null}
                      <ul className="mt-1.5 flex flex-wrap gap-1">
                        {member.reasons.map((reason) => (
                          <li key={reason} className="rounded-full bg-white/[0.07] px-2 py-0.5 text-micro text-white/80">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${member.name}`}
                      onClick={() => {
                        const next = [...removed, member.userId];
                        setRemoved(next);
                        setProposal({ ...proposal, members: proposal.members.filter((m) => m.userId !== member.userId) });
                      }}
                      className="-m-1 h-fit cursor-pointer rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void invite()}
                  disabled={busy === "invite" || !proposal.members.length}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 sm:w-auto"
                >
                  {busy === "invite" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Users className="size-4" aria-hidden />}
                  Invite {proposal.members.length === 1 ? "them" : `all ${proposal.members.length}`}
                </button>
                {removed.length ? (
                  <button type="button" onClick={() => void findCircle()} className="inline-flex w-full cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm text-white/65 hover:text-white sm:w-auto">
                    Refill the circle
                  </button>
                ) : null}
                <p className="text-caption text-white/45">Everyone gets an invite; the circle opens when someone accepts.</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {invitations.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-white sm:text-lg">💌 Invitations</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {invitations.map((circle) => {
              const me = circle.members.find((member) => member.isMe);
              return (
                <li key={circle.id} className="flex flex-col gap-3 rounded-2xl border border-brand-magenta/30 bg-surface/70 p-4">
                  <div>
                    <p className="font-bold text-white">{circle.title}</p>
                    <p className="text-sm text-brand-pink">{circle.vibe}</p>
                    {me?.reason ? <p className="mt-1 text-caption text-white/60">Why you: {me.reason}</p> : null}
                  </div>
                  <div className="flex -space-x-2">
                    {circle.members.map((member) => (
                      <Avatar key={member.userId} name={member.name} color={member.avatarColor} url={member.avatarUrl} size="size-8" />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={busy === circle.id} onClick={() => void respond(circle, "accept")} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white">
                      <Check className="size-4" aria-hidden /> Join
                    </button>
                    <button type="button" disabled={busy === circle.id} onClick={() => void respond(circle, "decline")} className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/10">
                      Not for me
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {mine.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-white sm:text-lg">👥 Your circles</h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {mine.map((circle) => (
              <li key={circle.id} className={cn("flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/70 p-4", busy === circle.id && "animate-pulse")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{circle.title}</p>
                    <p className="text-sm text-brand-pink">{circle.vibe}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-micro font-semibold", circle.status === "ACTIVE" ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/60")}>
                    {circle.status === "ACTIVE" ? "Active" : "Waiting for replies"}
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {circle.members.map((member) => (
                    <li key={member.userId} className="flex items-center gap-2.5">
                      <Avatar name={member.name} color={member.avatarColor} url={member.avatarUrl} size="size-8" />
                      <div className="min-w-0 flex-1">
                        <Link href={getProfilePath(member.handle)} className="truncate text-sm text-white hover:text-brand-pink">
                          {member.isMe ? "You" : member.name}
                        </Link>
                        <p className="truncate text-caption text-white/45">{member.status === "INVITED" ? "Invited" : member.reason}</p>
                      </div>
                      {!member.isMe && member.status === "ACCEPTED" && circle.status === "ACTIVE" ? (
                        <button type="button" onClick={() => void sayHi(circle, member.handle, member.name)} className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-caption text-white/80 hover:bg-white/10">
                          <MessageCircle className="size-3.5" aria-hidden /> Say hi
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {circle.status === "ACTIVE" && circle.communitySlug ? (
                  <div className="grid grid-cols-3 gap-2">
                    <Link href={getCommunityDashboardPath(circle.communitySlug, "chat")} className="inline-flex flex-col items-center gap-1 rounded-xl bg-white/[0.06] px-2 py-2 text-caption text-white hover:bg-white/10">
                      <MessagesSquare className="size-4 text-brand-pink" aria-hidden /> Group chat
                    </Link>
                    <Link href={getCommunityDashboardPath(circle.communitySlug, "watch-channel")} className="inline-flex flex-col items-center gap-1 rounded-xl bg-white/[0.06] px-2 py-2 text-caption text-white hover:bg-white/10">
                      <Tv className="size-4 text-brand-pink" aria-hidden /> Watch rooms
                    </Link>
                    <Link href={getCommunityDashboardPath(circle.communitySlug, "voice-channel")} className="inline-flex flex-col items-center gap-1 rounded-xl bg-white/[0.06] px-2 py-2 text-caption text-white hover:bg-white/10">
                      <Mic className="size-4 text-brand-pink" aria-hidden /> Voice rooms
                    </Link>
                  </div>
                ) : (
                  <p className="text-caption text-white/50">The circle&apos;s space (chat, posts, rooms) opens as soon as someone accepts.</p>
                )}
                <button type="button" onClick={() => void respond(circle, "leave")} className="inline-flex w-fit cursor-pointer items-center gap-1 text-caption text-white/45 hover:text-white">
                  <UserMinus className="size-3.5" aria-hidden /> Leave circle
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
