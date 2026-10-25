import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionPlayView } from "@/components/collection/collection-play-view";
import { getArtistDetail } from "@/lib/data/artist-detail";
import { getArtistPlayQueue } from "@/lib/services/artist-play.service";

interface ArtistPlayPageProps {
  params: Promise<{ artistid: string }>;
}

export async function generateMetadata({
  params,
}: ArtistPlayPageProps): Promise<Metadata> {
  const { artistid } = await params;
  const artist = await getArtistDetail(artistid);
  if (!artist) return { title: "Play Artist — EntertainVerse" };
  return {
    title: `Play ${artist.title} — EntertainVerse`,
    description: `Listen to all ${artist.title} songs in order on EntertainVerse.`,
  };
}

export default async function ArtistPlayPage({ params }: ArtistPlayPageProps) {
  const { artistid } = await params;
  const [artist, queue] = await Promise.all([
    getArtistDetail(artistid),
    getArtistPlayQueue(artistid),
  ]);

  if (!artist || !queue) notFound();

  return (
    <CollectionPlayView
      artistSlug={artist.id}
      initialQueue={queue}
    />
  );
}
