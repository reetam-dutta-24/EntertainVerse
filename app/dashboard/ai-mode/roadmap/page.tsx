import type { Metadata } from "next";
import { RoadmapBoard } from "@/components/ai-mode/roadmap-board";
import { getCurrentUser } from "@/lib/data/user";
import { getActiveRoadmapView } from "@/lib/services/roadmap.service";

export const metadata: Metadata = {
  title: "Your roadmap — EntertainVerse",
  description: "An ordered, time-budgeted plan of what to watch or listen to next, with an AI analysis of your taste.",
};

interface RoadmapPageProps {
  searchParams: Promise<{ mode?: string; build?: string }>;
}

export default async function RoadmapPage({ searchParams }: RoadmapPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const mode = params.mode === "listen" ? "listen" : "watch";
  const roadmap = await getActiveRoadmapView(user.id, mode);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      {/* key: switching mode remounts the board with that mode's roadmap */}
      <RoadmapBoard key={mode} mode={mode} initialRoadmap={roadmap} autoBuild={params.build === "1"} />
    </div>
  );
}
