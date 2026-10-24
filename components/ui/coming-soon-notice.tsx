import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Honest label for features whose UI exists but whose live part isn't built yet. */
export function ComingSoonNotice({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-100",
        className,
      )}
    >
      <Clock className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
      <p>
        <span className="me-1.5 inline-flex rounded-full bg-amber-300/20 px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-amber-200">
          Coming soon
        </span>
        {children}
      </p>
    </div>
  );
}

/** Small inline label, e.g. next to a track that plays demo audio. */
/** "demo": a placeholder track; "clip": the official 30-second preview. */
export function PreviewBadge({ className, kind = "demo" }: { className?: string; kind?: "demo" | "clip" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-white/80",
        className,
      )}
      title={
        kind === "clip"
          ? "Official 30-second preview — open a listen link for the full song"
          : "No full track is linked yet — playing a short preview"
      }
    >
      {kind === "clip" ? "30s preview" : "Preview audio"}
    </span>
  );
}
