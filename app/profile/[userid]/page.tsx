import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CollectionCard, CommunityCard } from "@/components/cards";
import {
  ProfileAnalyticsSection,
  ProfileDetailHero,
  ProfileFriendsSection,
  ProfileRecentActivitySection,
} from "@/components/profile";
import {
  ContentPageSection,
  InteractiveReviewSection,
} from "@/components/content";
import {
  ContentCarouselSection,
  MusicCarouselSection,
} from "@/components/dashboard";
import { PROFILE_SECTION_IDS } from "@/lib/profile-section-ids";
import { getProfilePath, normalizeProfileSlug } from "@/lib/profile-routes";
import { getOptionalUser } from "@/lib/data/user";
import { getUserDetail } from "@/lib/data/user-detail";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ userid: string }>;
}

const SECTION_CLASS = "scroll-mt-[72px]";

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { userid } = await params;
  const profile = await getUserDetail(userid);
  if (!profile) return { title: "Profile — EntertainVerse" };
  return {
    title: `${profile.name} — EntertainVerse`,
    description: profile.bio,
  };
}

export default async function ProfileDetailPage({ params }: ProfilePageProps) {
  const { userid } = await params;
  const viewer = await getOptionalUser();
  const profile = await getUserDetail(userid, viewer?.id);

  if (!profile) notFound();
  // Opened by user id (avatar links that only know the id) → canonical handle URL.
  if (normalizeProfileSlug(userid) !== normalizeProfileSlug(profile.handle)) redirect(getProfilePath(profile.handle));

  const isOwner = viewer?.handle === profile.handle;
  const firstName = profile.name.split(" ")[0];

  return (
    <div className="flex w-full flex-col">
      <ProfileDetailHero profile={profile} isOwner={isOwner} />
      {profile.isPrivatePreview ? (
        <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8 lg:px-12">
          <p className="text-center text-sm text-white/70">
            Only friends can see this user&apos;s full profile, activity, and collections.
          </p>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 pt-10 sm:gap-12 sm:px-8 lg:gap-14 lg:px-12">
          <section
            id={PROFILE_SECTION_IDS.recentActivity}
            className={SECTION_CLASS}
          >
            <ProfileRecentActivitySection
              userName={profile.name}
              activitySubtitle={profile.activitySubtitle}
              items={profile.recentActivity}
            />
          </section>

          <section
            id={PROFILE_SECTION_IDS.favoriteAnime}
            className={SECTION_CLASS}
          >
            <ContentCarouselSection
              title={`📺 Favorite Anime & Shows Of ${firstName}`}
              searchPlaceholder="Search titles…"
              items={profile.favoriteAnimeShow}
              emptyMessage="No favorite anime or shows yet."
            />
          </section>

          <section
            id={PROFILE_SECTION_IDS.favoriteMovies}
            className={SECTION_CLASS}
          >
            <ContentCarouselSection
              title={`🎬 Favorite Movies Of ${firstName}`}
              searchPlaceholder="Search movies…"
              items={profile.favoriteMovies}
              emptyMessage="No favorite movies yet."
            />
          </section>

          <section id={PROFILE_SECTION_IDS.artists} className={SECTION_CLASS}>
            <ContentCarouselSection
              title={`🎤 Artists ${firstName} Follows`}
              searchPlaceholder="Search artists…"
              items={profile.followedArtists}
              emptyMessage="Not following any artists yet."
            />
          </section>

          <section
            id={PROFILE_SECTION_IDS.favoriteSongs}
            className={SECTION_CLASS}
          >
            <MusicCarouselSection
              title={`❤️ Favorite Song Of ${firstName}`}
              searchPlaceholder="Search tracks…"
              tracks={profile.likedSongs}
              emptyMessage="No favorite songs yet."
            />
          </section>

          <section
            id={PROFILE_SECTION_IDS.favoriteAlbums}
            className={SECTION_CLASS}
          >
            <MusicCarouselSection
              title={`💿 Favorite Albums Of ${firstName}`}
              searchPlaceholder="Search albums…"
              tracks={profile.likedAlbums}
              emptyMessage="No favorite albums yet."
            />
          </section>

          {profile.analytics ? (
            <section id={PROFILE_SECTION_IDS.analytics} className={SECTION_CLASS}>
              <ProfileAnalyticsSection
                userName={firstName}
                data={profile.analytics}
              />
            </section>
          ) : null}

          <section id={PROFILE_SECTION_IDS.collections} className={SECTION_CLASS}>
            <ContentPageSection
              title={`📒 Public Collections By ${firstName}`}
              variant="community"
              slides={profile.collections.map((collection) => ({
                id: collection.id,
                node: <CollectionCard collection={collection} />,
              }))}
              emptyMessage="No public collections yet."
            />
          </section>

          <section id={PROFILE_SECTION_IDS.friends} className={SECTION_CLASS}>
            <ProfileFriendsSection
              title={`👥 Friends Of ${firstName}`}
              friends={profile.friends}
            />
          </section>

          <section id={PROFILE_SECTION_IDS.communities} className={SECTION_CLASS}>
            <ContentPageSection
              title={`🌐 Public Communities ${firstName} Is Part Of`}
              variant="community"
              slides={profile.communities.map((community) => ({
                id: community.id,
                node: (
                  <CommunityCard
                    community={community}
                    ctaMode="join"
                  />
                ),
              }))}
              emptyMessage="Not part of any public communities yet."
            />
          </section>

          <section id={PROFILE_SECTION_IDS.reviews} className={SECTION_CLASS}>
            <InteractiveReviewSection
              title={`✍️ Reviews By ${firstName}`}
              reviews={profile.reviews}
              viewerUserId={viewer?.id}
              allowCreate={false}
            />
          </section>
        </div>
      )}
    </div>
  );
}
