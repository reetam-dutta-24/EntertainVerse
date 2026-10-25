import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import { canAccessAdminSection } from "@/lib/admin-nav";
import { countCatalogArtists } from "@/lib/services/artist.service";
import { countCatalogContent } from "@/lib/services/content.service";
import { countCatalogTracks } from "@/lib/services/music.service";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  const { role } = await requireAdmin();

  const showContent = canAccessAdminSection(role, "content");
  const showMusic = canAccessAdminSection(role, "music");
  const showArtists = canAccessAdminSection(role, "artists");
  const showCollections = canAccessAdminSection(role, "collections");
  const showCommunities = canAccessAdminSection(role, "communities");

  const [contentCount, musicCount, artistCount, collectionCount, communityCount] =
    await Promise.all([
    showContent ? countCatalogContent() : Promise.resolve(0),
    showMusic ? countCatalogTracks() : Promise.resolve(0),
    showArtists ? countCatalogArtists() : Promise.resolve(0),
    showCollections
      ? prisma.collection.count({ where: { visibility: "PUBLIC" } })
      : Promise.resolve(0),
    showCommunities
      ? prisma.community.count({ where: { visibility: "PUBLIC" } })
      : Promise.resolve(0),
  ]);

  const visibleCards = [
    showContent && {
      label: "Content titles",
      count: contentCount,
      href: "/admin/content/new",
      cta: "+ Add content",
    },
    showMusic && {
      label: "Music tracks",
      count: musicCount,
      href: "/admin/music/new",
      cta: "+ Add track",
    },
    showArtists && {
      label: "Artists",
      count: artistCount,
      href: "/admin/artists/new",
      cta: "+ Add artist",
    },
    showCollections && {
      label: "Public collections",
      count: collectionCount,
      href: "/admin/collections",
      cta: "Manage collections",
    },
    showCommunities && {
      label: "Public communities",
      count: communityCount,
      href: "/admin/communities",
      cta: "Manage communities",
    },
  ].filter(Boolean) as {
    label: string;
    count: number;
    href: string;
    cta: string;
  }[];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Catalog overview</h1>
        <p className="mt-2 text-sm text-white/60">
          Manage the catalog areas assigned to your admin role.
        </p>
      </div>

      <div
        className={`grid gap-4 ${
          visibleCards.length === 1
            ? "sm:grid-cols-1"
            : visibleCards.length === 2
              ? "sm:grid-cols-2"
              : "sm:grid-cols-3"
        }`}
      >
        {visibleCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <p className="text-xs uppercase tracking-wide text-white/45">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{card.count}</p>
            <Link
              href={card.href}
              className="mt-3 inline-block text-xs text-brand-pink hover:underline"
            >
              {card.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/65">
        <p className="font-semibold text-white">Getting started</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Run <code className="text-brand-pink">npm run db:reset</code> for a
            fresh database (destructive — deletes all data). Use{" "}
            <code className="text-brand-pink">npm run db:seed</code> only to add
            starter catalog without wiping.
          </li>
          <li>
            Sign in with your role-specific admin account (e.g.{" "}
            <code className="text-brand-pink">content@entertainverse.local</code>).
          </li>
          <li>
            Create or edit catalog items — public pages read from PostgreSQL
            first.
          </li>
        </ol>
      </div>
    </div>
  );
}
