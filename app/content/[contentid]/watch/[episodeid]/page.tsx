import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPlayView } from "@/components/content/content-play-view";
import { ContentWatchTracker } from "@/components/content/content-watch-tracker";
import { getContentPlaySession } from "@/lib/services/content-play.service";

interface ContentEpisodeWatchPageProps {
  params: Promise<{ contentid: string; episodeid: string }>;
}

export async function generateMetadata({
  params,
}: ContentEpisodeWatchPageProps): Promise<Metadata> {
  const { contentid, episodeid } = await params;
  const session = await getContentPlaySession(contentid, episodeid);
  if (!session) return { title: "Watch — EntertainVerse" };
  return {
    title: `Watch ${session.contentTitle} — EntertainVerse`,
    description: `Stream ${session.contentTitle} on EntertainVerse.`,
  };
}

export default async function ContentEpisodeWatchPage({
  params,
}: ContentEpisodeWatchPageProps) {
  const { contentid, episodeid } = await params;
  const session = await getContentPlaySession(contentid, episodeid);
  if (!session) notFound();

  return (
    <>
      <ContentWatchTracker contentSlug={session.contentSlug} />
      <ContentPlayView session={session} />
    </>
  );
}
