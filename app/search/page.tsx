import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchResultsView } from "@/components/search/search-results-view";
import { getSearchPageData } from "@/lib/data/search";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim();
  if (!query) return { title: "Search — EntertainVerse" };
  return {
    title: `${query} — Search — EntertainVerse`,
    description: `Search results for ${query} on EntertainVerse`,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim();

  if (!query) {
    redirect("/dashboard/discover");
  }

  const data = await getSearchPageData(query);
  if (!data) {
    redirect("/dashboard/discover");
  }

  return <SearchResultsView data={data} />;
}
