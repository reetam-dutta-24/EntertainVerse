import type { Metadata } from "next";
import { WrappedStory } from "@/components/wrapped/wrapped-story";
import { getCurrentUser } from "@/lib/data/user";
import { getWrapped } from "@/lib/services/wrapped.service";

export const metadata: Metadata = {
  title: "Wrapped — EntertainVerse",
  description: "Your year on EntertainVerse: top titles, songs, Taste DNA eras and your AI-named persona.",
};

export const dynamic = "force-dynamic";

export default async function WrappedPage() {
  const user = await getCurrentUser();
  const data = await getWrapped(user.id);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <div className="text-center">
        <h1 className="text-lg font-bold text-white sm:text-xl">🎁 EntertainVerse Wrapped {data.year}</h1>
        <p className="mt-1 text-xs text-muted sm:text-sm">Built live from your real watching, listening and favorites — {data.year} so far.</p>
      </div>
      <WrappedStory data={data} />
    </div>
  );
}
