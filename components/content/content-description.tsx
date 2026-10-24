"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

/** ~4 lines at 15px / 1.75 line-height — matches the detail hero synopsis block. */
export const CONTENT_DESCRIPTION_MAX_HEIGHT_PX = 112;

interface ContentDescriptionProps {
  text: string;
  referenceUrl: string;
  className?: string;
}

export function ContentDescription({
  text,
  referenceUrl,
  className,
}: ContentDescriptionProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text]);

  return (
    <div className={className}>
      <p
        ref={ref}
        className="overflow-hidden text-sm leading-relaxed text-white/85 sm:text-body sm:leading-7"
        style={{ maxHeight: CONTENT_DESCRIPTION_MAX_HEIGHT_PX }}
      >
        {text}
      </p>
      {isClamped ? (
        <a
          href={referenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-pink transition-colors hover:text-brand-pink/80 hover:underline"
        >
          Read more
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          <span className="sr-only"> (opens plot summary on an external reference site)</span>
        </a>
      ) : null}
    </div>
  );
}
