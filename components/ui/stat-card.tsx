import { cn } from "@/lib/utils";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
}

/** Blue-to-violet gradient metric card (e.g. "Content Watched — 186"). */
export function StatCard({ label, value, className, ...props }: StatCardProps) {
  return (
    <div
      className={cn(
        "mx-auto flex h-auto min-h-[150px] w-full max-w-[260px] flex-col items-center justify-center gap-1.5 rounded-card bg-gradient-blue-violet p-2.5 text-center text-white",
        className,
      )}
      {...props}
    >
      <p className="text-base font-bold">{label}</p>
      <p className="text-4xl font-bold">{value}</p>
    </div>
  );
}
