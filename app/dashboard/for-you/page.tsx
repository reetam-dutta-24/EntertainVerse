import type { Metadata } from "next";
import {
  AiTasteProfileBar,
  ContentCarouselSection,
  MusicCarouselSection,
  WelcomeBanner,
} from "@/components/dashboard";
import { AiModeLauncher } from "@/components/ai-mode/ai-mode-launcher";
import { getAiTasteProfileScore, getForYouFeed } from "@/lib/data/for-you";
import { getCurrentUser } from "@/lib/data/user";

export const metadata: Metadata = {
  title: "For You — AniVerse",
  description:
    "Personalized anime, movies, shows, and music picked from your AI taste profile.",
};

export default async function ForYouPage() {
  const user = await getCurrentUser();
  const [tasteScore, feed] = await Promise.all([
    getAiTasteProfileScore(user.id),
    getForYouFeed(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <WelcomeBanner userName={user.name} variant="foryou" />
      <AiModeLauncher defaultMode="watch" />

      <AiTasteProfileBar score={tasteScore} />

      {feed.shelves.map((shelf) =>
        shelf.kind === "music" ? (
          <MusicCarouselSection
            key={shelf.key}
            title={shelf.title}
            subtitle={shelf.subtitle}
            searchPlaceholder="Search Music Content……. "
            tracks={shelf.tracks}
          />
        ) : (
          <ContentCarouselSection
            key={shelf.key}
            title={shelf.title}
            subtitle={shelf.subtitle}
            searchPlaceholder="Search Content……. "
            items={shelf.items}
          />
        ),
      )}
    </div>
  );
}
