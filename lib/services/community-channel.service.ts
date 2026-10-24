import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapUserSummary } from "@/lib/mappers/community.mapper";
import type { VoiceChannel, WatchParty } from "@/types";
import type {
  VoiceChannelFormInput,
  VoiceChannelUpdateInput,
  WatchChannelFormInput,
  WatchChannelUpdateInput,
} from "@/lib/validators/community";
import {
  CommunityForbiddenError,
  CommunityNotFoundError,
} from "@/lib/services/community.service";

const voiceChannelInclude = {
  creator: {
    select: { id: true, name: true, avatarColor: true, avatarUrl: true },
  },
  members: {
    include: {
      user: {
        select: { id: true, name: true, handle: true, avatarColor: true, avatarUrl: true },
      },
    },
    orderBy: { joinedAt: "asc" as const },
  },
} satisfies Prisma.CommunityVoiceChannelInclude;

const watchChannelInclude = {
  creator: {
    select: { id: true, name: true, avatarColor: true, avatarUrl: true },
  },
  content: {
    select: { id: true, slug: true, title: true, imageUrl: true, accent: true },
  },
  track: {
    select: {
      id: true,
      slug: true,
      title: true,
      artist: true,
      imageUrl: true,
      accent: true,
    },
  },
  members: {
    include: {
      user: {
        select: { id: true, name: true, handle: true, avatarColor: true, avatarUrl: true },
      },
    },
    orderBy: { joinedAt: "asc" as const },
  },
} satisfies Prisma.CommunityWatchChannelInclude;

async function requireCommunityMembership(userId: string, slug: string) {
  const membership = await prisma.communityMember.findFirst({
    where: { userId, community: { slug } },
    include: { community: true },
  });
  if (!membership) {
    throw new CommunityForbiddenError("Join the community first.");
  }
  return membership;
}

async function getStaffMembership(userId: string, slug: string) {
  const membership = await prisma.communityMember.findFirst({
    where: {
      userId,
      community: { slug },
      role: { in: ["ADMIN", "MODERATOR"] },
    },
  });
  return membership;
}

function mapVoiceChannel(
  row: Prisma.CommunityVoiceChannelGetPayload<{ include: typeof voiceChannelInclude }>,
  viewerUserId?: string,
  viewerIsStaff = false,
): VoiceChannel {
  const participants = row.members.map((member) => mapUserSummary(member.user));
  const viewerJoined = viewerUserId
    ? row.members.some((member) => member.userId === viewerUserId)
    : false;
  const canManage =
    Boolean(viewerUserId && viewerUserId === row.creatorId) || viewerIsStaff;

  return {
    id: row.id,
    title: row.title,
    subtitle: row.creator.name,
    hostName: row.creator.name,
    memberCount: row.members.length,
    memberLimit: row.memberLimit,
    participants,
    accent: "purple",
    viewerJoined,
    canEdit: Boolean(viewerUserId && viewerUserId === row.creatorId),
    canDelete: canManage,
  };
}

function mapWatchChannel(
  row: Prisma.CommunityWatchChannelGetPayload<{ include: typeof watchChannelInclude }>,
  viewerUserId?: string,
  viewerIsStaff = false,
): WatchParty {
  const participants = row.members.map((member) => mapUserSummary(member.user));
  const viewerJoined = viewerUserId
    ? row.members.some((member) => member.userId === viewerUserId)
    : false;
  const nowPlaying =
    row.mediaTitle ??
    row.content?.title ??
    (row.track ? `${row.track.title} — ${row.track.artist}` : undefined);
  const canManage =
    Boolean(viewerUserId && viewerUserId === row.creatorId) || viewerIsStaff;

  return {
    id: row.id,
    title: row.title,
    nowPlaying,
    live: row.members.length > 0,
    viewerCount: row.members.length,
    memberLimit: row.memberLimit,
    participants,
    imageUrl:
      row.imageUrl ?? row.content?.imageUrl ?? row.track?.imageUrl ?? undefined,
    accent:
      (row.content?.accent as WatchParty["accent"]) ??
      (row.track?.accent as WatchParty["accent"]) ??
      "purple",
    viewerJoined,
    canEdit: Boolean(viewerUserId && viewerUserId === row.creatorId),
    canDelete: canManage,
  };
}

export async function listCommunityVoiceChannels(slug: string, viewerUserId?: string) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new CommunityNotFoundError("Community not found.");

  const viewerMembership = viewerUserId
    ? await prisma.communityMember.findFirst({
        where: { userId: viewerUserId, communityId: community.id },
      })
    : null;
  const viewerIsStaff =
    viewerMembership?.role === "ADMIN" || viewerMembership?.role === "MODERATOR";

  const rows = await prisma.communityVoiceChannel.findMany({
    where: { communityId: community.id },
    include: voiceChannelInclude,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => mapVoiceChannel(row, viewerUserId, viewerIsStaff));
}

export async function createCommunityVoiceChannel(
  userId: string,
  slug: string,
  input: VoiceChannelFormInput,
) {
  const membership = await requireCommunityMembership(userId, slug);

  const channel = await prisma.communityVoiceChannel.create({
    data: {
      communityId: membership.communityId,
      creatorId: userId,
      title: input.title.trim(),
      memberLimit: input.memberLimit,
      members: {
        create: { userId },
      },
    },
    include: voiceChannelInclude,
  });

  return mapVoiceChannel(channel, userId);
}

export async function updateCommunityVoiceChannel(
  userId: string,
  slug: string,
  channelId: string,
  input: VoiceChannelUpdateInput,
) {
  const channel = await prisma.communityVoiceChannel.findFirst({
    where: { id: channelId, community: { slug }, creatorId: userId },
  });
  if (!channel) throw new CommunityNotFoundError("Voice channel not found.");

  const updated = await prisma.communityVoiceChannel.update({
    where: { id: channelId },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.memberLimit !== undefined ? { memberLimit: input.memberLimit } : {}),
    },
    include: voiceChannelInclude,
  });

  return mapVoiceChannel(updated, userId);
}

export async function deleteCommunityVoiceChannel(
  userId: string,
  slug: string,
  channelId: string,
) {
  const channel = await prisma.communityVoiceChannel.findFirst({
    where: {
      id: channelId,
      community: { slug },
      OR: [
        { creatorId: userId },
        {
          community: {
            members: {
              some: {
                userId,
                role: { in: ["ADMIN", "MODERATOR"] },
              },
            },
          },
        },
      ],
    },
  });
  if (!channel) throw new CommunityNotFoundError("Voice channel not found.");

  await prisma.communityVoiceChannel.delete({ where: { id: channelId } });
}

export async function joinCommunityVoiceChannel(
  userId: string,
  slug: string,
  channelId: string,
) {
  await requireCommunityMembership(userId, slug);

  const channel = await prisma.communityVoiceChannel.findFirst({
    where: { id: channelId, community: { slug } },
    include: { members: true },
  });
  if (!channel) throw new CommunityNotFoundError("Voice channel not found.");

  if (channel.members.some((member) => member.userId === userId)) {
    return listCommunityVoiceChannels(slug, userId);
  }
  if (channel.members.length >= channel.memberLimit) {
    throw new CommunityForbiddenError("This voice channel is full.");
  }

  await prisma.communityVoiceChannelMember.create({
    data: { channelId, userId },
  });

  return listCommunityVoiceChannels(slug, userId);
}

export async function leaveCommunityVoiceChannel(
  userId: string,
  slug: string,
  channelId: string,
) {
  const member = await prisma.communityVoiceChannelMember.findFirst({
    where: {
      channelId,
      userId,
      channel: { community: { slug } },
    },
  });
  if (!member) throw new CommunityNotFoundError("You are not in this voice channel.");

  await prisma.communityVoiceChannelMember.delete({ where: { id: member.id } });
  return listCommunityVoiceChannels(slug, userId);
}

async function resolveWatchMedia(input: WatchChannelFormInput | WatchChannelUpdateInput) {
  if (input.trackSlug?.trim()) {
    const track = await prisma.musicTrack.findUnique({
      where: { slug: input.trackSlug.trim() },
    });
    if (!track) throw new CommunityNotFoundError("Music track not found.");
    return {
      contentId: null as string | null,
      trackId: track.id,
      mediaTitle: `${track.title} — ${track.artist}`,
      imageUrl: track.imageUrl,
    };
  }

  if (input.contentSlug?.trim()) {
    const content = await prisma.content.findUnique({
      where: { slug: input.contentSlug.trim() },
    });
    if (!content) throw new CommunityNotFoundError("Content not found.");
    return {
      contentId: content.id,
      trackId: null as string | null,
      mediaTitle: content.title,
      imageUrl: content.imageUrl,
    };
  }

  return null;
}

export async function listCommunityWatchChannels(slug: string, viewerUserId?: string) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new CommunityNotFoundError("Community not found.");

  const viewerMembership = viewerUserId
    ? await prisma.communityMember.findFirst({
        where: { userId: viewerUserId, communityId: community.id },
      })
    : null;
  const viewerIsStaff =
    viewerMembership?.role === "ADMIN" || viewerMembership?.role === "MODERATOR";

  const rows = await prisma.communityWatchChannel.findMany({
    where: { communityId: community.id },
    include: watchChannelInclude,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => mapWatchChannel(row, viewerUserId, viewerIsStaff));
}

export async function createCommunityWatchChannel(
  userId: string,
  slug: string,
  input: WatchChannelFormInput,
) {
  const membership = await requireCommunityMembership(userId, slug);
  const media = await resolveWatchMedia(input);
  if (!media) {
    throw new CommunityNotFoundError("Select content or music for the watch channel.");
  }

  const channel = await prisma.communityWatchChannel.create({
    data: {
      communityId: membership.communityId,
      creatorId: userId,
      title: input.title.trim(),
      memberLimit: input.memberLimit,
      contentId: media.contentId,
      trackId: media.trackId,
      mediaTitle: media.mediaTitle,
      imageUrl: media.imageUrl,
      members: {
        create: { userId },
      },
    },
    include: watchChannelInclude,
  });

  return mapWatchChannel(channel, userId);
}

export async function updateCommunityWatchChannel(
  userId: string,
  slug: string,
  channelId: string,
  input: WatchChannelUpdateInput,
) {
  const channel = await prisma.communityWatchChannel.findFirst({
    where: { id: channelId, community: { slug }, creatorId: userId },
  });
  if (!channel) throw new CommunityNotFoundError("Watch channel not found.");

  const media = await resolveWatchMedia(input);

  const updated = await prisma.communityWatchChannel.update({
    where: { id: channelId },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.memberLimit !== undefined ? { memberLimit: input.memberLimit } : {}),
      ...(media
        ? {
            contentId: media.contentId,
            trackId: media.trackId,
            mediaTitle: media.mediaTitle,
            imageUrl: media.imageUrl,
          }
        : {}),
    },
    include: watchChannelInclude,
  });

  return mapWatchChannel(updated, userId);
}

export async function deleteCommunityWatchChannel(
  userId: string,
  slug: string,
  channelId: string,
) {
  const channel = await prisma.communityWatchChannel.findFirst({
    where: {
      id: channelId,
      community: { slug },
      OR: [
        { creatorId: userId },
        {
          community: {
            members: {
              some: {
                userId,
                role: { in: ["ADMIN", "MODERATOR"] },
              },
            },
          },
        },
      ],
    },
  });
  if (!channel) throw new CommunityNotFoundError("Watch channel not found.");

  await prisma.communityWatchChannel.delete({ where: { id: channelId } });
}

export async function joinCommunityWatchChannel(
  userId: string,
  slug: string,
  channelId: string,
) {
  await requireCommunityMembership(userId, slug);

  const channel = await prisma.communityWatchChannel.findFirst({
    where: { id: channelId, community: { slug } },
    include: { members: true },
  });
  if (!channel) throw new CommunityNotFoundError("Watch channel not found.");

  if (channel.members.some((member) => member.userId === userId)) {
    return listCommunityWatchChannels(slug, userId);
  }
  if (channel.members.length >= channel.memberLimit) {
    throw new CommunityForbiddenError("This watch channel is full.");
  }

  await prisma.communityWatchChannelMember.create({
    data: { channelId, userId },
  });

  return listCommunityWatchChannels(slug, userId);
}

export async function leaveCommunityWatchChannel(
  userId: string,
  slug: string,
  channelId: string,
) {
  const member = await prisma.communityWatchChannelMember.findFirst({
    where: {
      channelId,
      userId,
      channel: { community: { slug } },
    },
  });
  if (!member) throw new CommunityNotFoundError("You are not in this watch channel.");

  await prisma.communityWatchChannelMember.delete({ where: { id: member.id } });
  return listCommunityWatchChannels(slug, userId);
}

export async function isCommunityStaff(userId: string, slug: string) {
  const membership = await getStaffMembership(userId, slug);
  return Boolean(membership);
}
