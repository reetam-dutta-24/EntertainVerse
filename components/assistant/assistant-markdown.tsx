"use client";

import Link from "next/link";
import type { AssistantSource } from "@/lib/assistant/types";

/**
 * Small, safe Markdown renderer for assistant answers: paragraphs, bullet and numbered
 * lists, **bold**, *italic*, `code`, links (internal paths and https only) and [n]
 * citations as chips. Builds React elements — never injects HTML.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\[\d+\](?!\()|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function safeHref(href: string) {
  if (href.startsWith("/") && !href.startsWith("//")) return { href, internal: true };
  if (/^https:\/\//i.test(href)) return { href, internal: false };
  return null;
}

function Citation({ n, source }: { n: number; source?: AssistantSource }) {
  const chip = (
    <span className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded-full bg-brand-magenta/20 px-1 align-middle text-[10px] font-semibold text-brand-pink">
      {n}
    </span>
  );
  if (!source?.href) return <span title={source?.title}>{chip}</span>;
  return (
    <Link href={source.href} title={source.title} aria-label={`Source ${n}: ${source.title}`} className="hover:opacity-80">
      {chip}
    </Link>
  );
}

function inline(text: string, sources: AssistantSource[], keyPrefix: string): React.ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={key} className="rounded bg-white/10 px-1 py-0.5 text-[0.85em]">{part.slice(1, -1)}</code>;
    const citation = /^\[(\d+)\]$/.exec(part);
    if (citation) {
      const n = Number(citation[1]);
      return <Citation key={key} n={n} source={sources[n - 1]} />;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const target = safeHref(link[2]!);
      if (!target) return link[1];
      return target.internal ? (
        <Link key={key} href={target.href} className="font-medium text-brand-pink underline decoration-brand-pink/40 underline-offset-2 hover:decoration-brand-pink">
          {link[1]}
        </Link>
      ) : (
        <a key={key} href={target.href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-pink underline decoration-brand-pink/40 underline-offset-2">
          {link[1]}
        </a>
      );
    }
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function AssistantMarkdown({ text, sources = [] }: { text: string; sources?: AssistantSource[] }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={`p${blocks.length}`}>{inline(paragraph.join(" "), sources, `p${blocks.length}`)}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, index) => <li key={index}>{inline(item, sources, `l${blocks.length}-${index}`)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={`l${blocks.length}`} className="list-decimal space-y-1 pl-5 marker:text-white/50">{items}</ol>
      ) : (
        <ul key={`l${blocks.length}`} className="list-disc space-y-1 pl-5 marker:text-brand-pink/70">{items}</ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]!);
    } else if (!line) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      // Strip heading markers — answers shouldn't shout.
      paragraph.push(line.replace(/^#{1,6}\s+/, ""));
    }
  }
  flushParagraph();
  flushList();
  return <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-white/85">{blocks}</div>;
}

/** Source numbers actually cited in an answer, in order of first use. */
export function citedSources(text: string, sources: AssistantSource[]) {
  const seen = new Set<number>();
  for (const match of text.matchAll(/\[(\d+)\](?!\()/g)) seen.add(Number(match[1]));
  return [...seen].filter((n) => sources[n - 1]).map((n) => ({ n, source: sources[n - 1]! }));
}
