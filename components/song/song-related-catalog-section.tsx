import type { ReactNode } from "react";
import { ArtistCard, PosterCard } from "@/components/cards";
import { ContentPageSection } from "@/components/content";
import type { ContentItem } from "@/types";

export interface SongRelatedCatalogSectionProps {
  linkedArtist?: ContentItem;
  linkedSourceContent?: ContentItem;
}

/** Song detail — real artist + show/movie cards when linked in the catalog. */
export function SongRelatedCatalogSection({
  linkedArtist,
  linkedSourceContent,
}: SongRelatedCatalogSectionProps) {
  const slides = [
    linkedArtist
      ? {
          id: `artist-${linkedArtist.id}`,
          node: <ArtistCard item={linkedArtist} />,
        }
      : null,
    linkedSourceContent
      ? {
          id: `source-${linkedSourceContent.id}`,
          node: <PosterCard item={linkedSourceContent} />,
        }
      : null,
  ].filter(Boolean) as { id: string; node: ReactNode }[];

  if (slides.length === 0) return null;

  return (
    <ContentPageSection
      title="🎤 Artists, album and show/anime/movie"
      variant="content"
      rowHover={false}
      overflowVisible
      itemsCenter={slides.length <= 2}
      slides={slides}
    />
  );
}
