import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityDashboardSectionContent } from "@/components/community/community-dashboard-section-content";
import {
  COMMUNITY_DASHBOARD_SECTIONS,
  isCommunityDashboardSection,
} from "@/lib/community-routes";
import {
  getCommunityDetail,
} from "@/lib/data/community-detail";
import { getOptionalUser } from "@/lib/data/user";

interface CommunityDashboardSectionPageProps {
  params: Promise<{ communityid: string; section: string }>;
}

export async function generateMetadata({
  params,
}: CommunityDashboardSectionPageProps): Promise<Metadata> {
  const { communityid, section } = await params;
  const community = await getCommunityDetail(communityid);
  if (!community || !isCommunityDashboardSection(section)) {
    return { title: "Community Dashboard — EntertainVerse" };
  }

  const navLabel =
    community.dashboardNav.find((item) => item.id === section)?.label ?? section;

  return {
    title: `${community.name} — ${navLabel} — EntertainVerse`,
  };
}

export default async function CommunityDashboardSectionPage({
  params,
}: CommunityDashboardSectionPageProps) {
  const { communityid, section } = await params;

  if (!isCommunityDashboardSection(section)) notFound();

  const viewer = await getOptionalUser();
  const community = await getCommunityDetail(communityid, viewer?.id);
  if (!community) notFound();

  return (
    <CommunityDashboardSectionContent
      section={section}
      community={community}
      viewerUserId={viewer?.id}
    />
  );
}
