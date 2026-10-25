import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityDashboardShell } from "@/components/community/community-dashboard-shell";
import { getCommunityDetail } from "@/lib/data/community-detail";
import { getOptionalUser } from "@/lib/data/user";

interface CommunityDashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ communityid: string }>;
}

export async function generateMetadata({
  params,
}: CommunityDashboardLayoutProps): Promise<Metadata> {
  const { communityid } = await params;
  const viewer = await getOptionalUser();
  const community = await getCommunityDetail(communityid, viewer?.id);
  if (!community) return { title: "Community Dashboard — EntertainVerse" };
  return {
    title: `${community.name} Dashboard — EntertainVerse`,
    description: `Community dashboard for ${community.name}`,
  };
}

export default async function CommunityDashboardLayout({
  children,
  params,
}: CommunityDashboardLayoutProps) {
  const { communityid } = await params;
  const viewer = await getOptionalUser();
  const community = await getCommunityDetail(communityid, viewer?.id);
  if (!community) notFound();

  return (
    <CommunityDashboardShell
      communityId={community.id}
      communityName={community.name}
      navItems={community.dashboardNav}
      onlineMembers={community.onlineMembers}
      canManageMembers={community.canDelete}
    >
      {children}
    </CommunityDashboardShell>
  );
}
