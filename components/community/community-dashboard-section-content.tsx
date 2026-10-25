"use client";

import { CommunityDashboardFeedPost } from "@/components/community/community-dashboard-feed-post";
import { cn } from "@/lib/utils";
import { getAccentStyle } from "@/lib/accents";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { CommunityFriendInvitePanel } from "@/components/community/community-friend-invite-panel";
import { CommunitySettingsDangerZone } from "@/components/community/community-settings-danger-zone";
import { CommunityChatPanel } from "@/components/community/community-chat-panel";
import { sectionToChatChannel } from "@/lib/community-chat";
import {
  CreateAnnouncementButton,
  CreateCommunityPostButton,
} from "@/components/forms/create-community-post-button";
import {
  CreateVoiceChannelButton,
  VoiceChannelActions,
} from "@/components/forms/community-voice-channel-form";
import {
  CreateWatchChannelButton,
  WatchChannelActions,
} from "@/components/forms/community-watch-channel-form";
import type { CommunityDashboardSection } from "@/lib/community-routes";
import type { CommunityDetail } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { useState } from "react";
import { Megaphone, Mic, Play, Radio, Sparkles, Tv } from "lucide-react";
import { ListenParty } from "@/components/party/listen-party";
import { TalkRoom } from "@/components/party/talk-room";
import { WatchParty } from "@/components/party/watch-party";

export interface CommunityDashboardSectionContentProps {
  section: CommunityDashboardSection;
  community: CommunityDetail;
  viewerUserId?: string;
}

function SectionHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cyan-400/12 bg-black/25 px-4 py-3 backdrop-blur-sm sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ScrollBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function WatchChannelRow({
  party,
  communitySlug,
  viewerUserId,
}: {
  party: CommunityDetail["dashboardWatchParties"][number];
  communitySlug: string;
  viewerUserId?: string;
}) {
  const accent = getAccentStyle(party.accent ?? "purple");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-card border border-white/[0.08] bg-black/35 p-4 shadow-card-inner sm:flex-row sm:items-center sm:p-5">
      <div className="relative h-[140px] w-full shrink-0 overflow-hidden rounded-2xl sm:h-[120px] sm:w-[200px]">
        {party.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={party.imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className={cn("size-full", accent.header)} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-white">{party.title}</h3>
        {party.nowPlaying ? (
          <p className="mt-1 text-sm text-white/65">{party.nowPlaying}</p>
        ) : null}
        {party.participants?.length ? (
          <div className="mt-2 flex items-center gap-2">
            <AvatarStack users={party.participants} size="sm" />
            <span className="text-xs text-white/60">
              {party.viewerCount ?? 0}
              {party.memberLimit ? ` / ${party.memberLimit}` : ""} members watching
            </span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-white/50">
            0{party.memberLimit ? ` / ${party.memberLimit}` : ""} members watching
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
        >
          <Play className="size-4" aria-hidden /> Join watch party
        </button>
        <WatchChannelActions communitySlug={communitySlug} channel={party} />
      </div>
      {open ? <WatchParty channelId={party.id} channelTitle={party.title} viewerUserId={viewerUserId} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function VoiceChannelRow({
  channel,
  communitySlug,
}: {
  channel: CommunityDetail["dashboardVoiceChannels"][number];
  communitySlug: string;
}) {
  const accent = getAccentStyle(channel.accent ?? "purple");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-card border border-white/[0.08] bg-black/35 p-4 shadow-card-inner sm:flex-row sm:items-center sm:p-5">
      <div
        className={cn(
          "h-[100px] w-full shrink-0 rounded-2xl sm:h-[88px] sm:w-[160px]",
          accent.header,
        )}
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-white">{channel.title}</h3>
        {channel.subtitle ? (
          <p className="mt-1 text-sm italic text-white/65">{channel.subtitle}</p>
        ) : null}
        {channel.participants?.length ? (
          <div className="mt-2 flex items-center gap-2">
            <AvatarStack users={channel.participants} size="sm" />
            <span className="text-xs text-white/60">
              {channel.memberCount ?? 0}
              {channel.memberLimit ? ` / ${channel.memberLimit}` : ""} members in VC
            </span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-white/50">
            0{channel.memberLimit ? ` / ${channel.memberLimit}` : ""} members in VC
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
        >
          <Mic className="size-4" aria-hidden /> Join talk room
        </button>
        <VoiceChannelActions communitySlug={communitySlug} channel={channel} />
      </div>
      {open ? <TalkRoom channelId={channel.id} channelTitle={channel.title} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function SettingsToggle({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-black/35 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-white/90">{label}</p>
        <p className="mt-0.5 text-xs text-white/55">{description}</p>
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 size-4 accent-brand-magenta"
      />
    </label>
  );
}

/** Renders the active dashboard section inside the cyan glass center panel. */
export function CommunityDashboardSectionContent({
  section,
  community,
  viewerUserId,
}: CommunityDashboardSectionContentProps) {
  const canModerate = community.canEdit;
  const communitySlug = community.id;

  switch (section) {
    case "posts":
      return (
        <>
          <SectionHeader>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-white/85">
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-emerald-500/75"
                />
                {community.dashboardOnlineCount.toLocaleString()} Online
              </span>
              <span className="text-white/50 italic">
                {community.dashboardPostsToday} Posts Today
              </span>
            </div>
            <CreateCommunityPostButton communitySlug={communitySlug} />
          </SectionHeader>
          <ScrollBody className="flex flex-col items-center gap-3">
            {community.dashboardPosts.length === 0 ? (
              <EmptyState compact icon={<Sparkles />} description="No posts yet. Be the first to share." />
            ) : (
              community.dashboardPosts.map((post) => (
                <CommunityDashboardFeedPost
                  key={post.id}
                  post={post}
                  communitySlug={communitySlug}
                />
              ))
            )}
          </ScrollBody>
        </>
      );

    case "chat":
      return (
        <CommunityChatPanel
          communitySlug={communitySlug}
          channel={sectionToChatChannel("chat")}
          viewerUserId={viewerUserId}
          isMember={Boolean(community.viewerRole)}
          accent={community.accent}
          placeholder="Heyyyy Nice To Meet You All"
        />
      );

    case "anime-chat":
      return (
        <CommunityChatPanel
          communitySlug={communitySlug}
          channel={sectionToChatChannel("anime-chat")}
          viewerUserId={viewerUserId}
          isMember={Boolean(community.viewerRole)}
          accent={community.accent}
          placeholder="Share your anime hot takes…"
        />
      );

    case "watch-channel":
      return (
        <>
          <SectionHeader>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-white/85">
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-emerald-500/75"
                />
                {community.dashboardOnlineCount.toLocaleString()} Online
              </span>
              <span className="text-white/50 italic">
                {community.dashboardMembersWatching} Members Watching Now
              </span>
            </div>
            <CreateWatchChannelButton communitySlug={communitySlug} />
          </SectionHeader>
          <ScrollBody className="flex flex-col gap-4">
            <p className="text-xs text-white/55">
              🎬 Synced for everyone: the host&apos;s play, pause and seek apply to the whole party. Plays licensed video,
              the official trailer, or a shared &ldquo;watch together&rdquo; clock for titles on your own streaming service.
            </p>
            {community.dashboardWatchParties.length === 0 ? (
              <EmptyState compact icon={<Tv />} description="No watch channels yet." />
            ) : (
              community.dashboardWatchParties.map((party) => (
                <WatchChannelRow
                  key={party.id}
                  party={party}
                  communitySlug={communitySlug}
                  viewerUserId={viewerUserId}
                />
              ))
            )}
          </ScrollBody>
        </>
      );

    case "voice-channel":
      return (
        <>
          <SectionHeader>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-white/85">
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-emerald-500/75"
                />
                {community.dashboardOnlineCount.toLocaleString()} Online
              </span>
              <span className="text-white/50 italic">
                {community.dashboardMembersInVc} Members in VCs Now
              </span>
            </div>
            <CreateVoiceChannelButton communitySlug={communitySlug} />
          </SectionHeader>
          <ScrollBody className="flex flex-col gap-4">
            <p className="text-xs text-white/55">
              🎙️ Live voice for up to 8 people — mute, see who&apos;s talking, drop in and out. Your browser will ask for
              the microphone.
            </p>
            {community.dashboardVoiceChannels.length === 0 ? (
              <EmptyState compact icon={<Radio />} description="No voice channels yet." />
            ) : (
              community.dashboardVoiceChannels.map((channel) => (
                <VoiceChannelRow
                  key={channel.id}
                  channel={channel}
                  communitySlug={communitySlug}
                />
              ))
            )}
          </ScrollBody>
        </>
      );

    case "listen-party":
      return (
        <>
          <SectionHeader>
            <p className="text-sm font-medium text-white/85">🎧 Listen Party — one queue, everyone hears it together</p>
          </SectionHeader>
          <ScrollBody>
            <ListenParty communitySlug={communitySlug} viewerUserId={viewerUserId} />
          </ScrollBody>
        </>
      );

    case "announcements":
      return (
        <>
          <SectionHeader>
            <p className="text-sm text-white/65">
              Only Admins And Mods Can Create Announcements
            </p>
            {canModerate ? (
              <CreateAnnouncementButton communitySlug={communitySlug} />
            ) : null}
          </SectionHeader>
          <ScrollBody className="flex flex-col items-center gap-3">
            {community.dashboardAnnouncements.length === 0 ? (
              <EmptyState compact icon={<Megaphone />} description="No announcements yet." />
            ) : (
              community.dashboardAnnouncements.map((post) => (
                <CommunityDashboardFeedPost
                  key={post.id}
                  post={post}
                  communitySlug={communitySlug}
                />
              ))
            )}
          </ScrollBody>
        </>
      );

    case "analytics":
      return (
        <>
          <SectionHeader>
            <p className="text-sm font-medium text-white/85">📊 Community Analytics</p>
            <span className="text-xs italic text-white/50">Last 7 days</span>
          </SectionHeader>
          <ScrollBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {community.dashboardAnalytics.map((stat) => (
                <div
                  key={stat.id}
                  className="rounded-2xl border border-cyan-400/12 bg-glass-cyan/15 p-4 shadow-card-inner backdrop-blur-sm"
                >
                  <p className="text-xs text-white/55">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </ScrollBody>
        </>
      );

    case "members":
      if (community.visibility !== "private" || !community.canDelete) {
        return (
          <ScrollBody>
            <p className="text-sm text-white/55">
              Friend invites are only available to admins of private communities.
            </p>
          </ScrollBody>
        );
      }
      return (
        <>
          <SectionHeader>
            <p className="text-sm font-medium text-white/85">👥 Invite Friends</p>
            <span className="text-xs text-white/50">Admin · Private community</span>
          </SectionHeader>
          <ScrollBody>
            <CommunityFriendInvitePanel communitySlug={communitySlug} />
          </ScrollBody>
        </>
      );

    case "settings":
      return (
        <>
          <SectionHeader>
            <p className="text-sm font-medium text-white/85">⚙️ Community Settings</p>
            <span className="text-xs text-white/50">
              {community.canDelete ? "Admin" : community.viewerRole ?? "Member"}
            </span>
          </SectionHeader>
          <ScrollBody className="flex max-w-xl flex-col gap-3">
            {community.canEdit ? (
              <>
                <SettingsToggle
                  label="Allow member posts"
                  description="Let members publish posts in the community feed."
                  defaultChecked={community.dashboardSettings.allowMemberPosts}
                />
                <SettingsToggle
                  label="Require post approval"
                  description="Moderators must approve posts before they go live."
                  defaultChecked={community.dashboardSettings.requireApproval}
                />
                <SettingsToggle
                  label="Show online status"
                  description="Display online indicators on member cards."
                  defaultChecked={community.dashboardSettings.showOnlineStatus}
                />
                <SettingsToggle
                  label="Enable watch parties"
                  description="Allow members to create and join watch channels."
                  defaultChecked={community.dashboardSettings.enableWatchParties}
                />
                <SettingsToggle
                  label="Enable voice channels"
                  description="Allow voice channel creation and joining."
                  defaultChecked={community.dashboardSettings.enableVoiceChannels}
                />
              </>
            ) : (
              <p className="text-sm text-white/55">
                Community preference toggles are managed by admins and moderators.
              </p>
            )}
            <CommunitySettingsDangerZone
              communitySlug={communitySlug}
              communityName={community.name}
              viewerRole={community.viewerRole}
              canDelete={community.canDelete}
            />
          </ScrollBody>
        </>
      );

    default:
      return null;
  }
}
