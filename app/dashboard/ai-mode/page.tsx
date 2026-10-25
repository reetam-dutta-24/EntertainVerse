import type { Metadata } from "next";
import { AiModeExperience } from "@/components/ai-mode/ai-mode-experience";
import { isAiConfigured } from "@/lib/ai/provider";
import { getCurrentUser } from "@/lib/data/user";
import { getQuizCatalog } from "@/lib/services/ai-mode.service";
import { getAiProfile } from "@/lib/services/ai-profile.service";

export const metadata: Metadata = {
  title: "AI mode — EntertainVerse",
  description: "Answer a one-minute quiz or chat with AI — get anime, shows, films and music that fit your mood, with reasons.",
};

interface AiModePageProps {
  searchParams: Promise<{ mode?: string; start?: string }>;
}

export default async function AiModePage({ searchParams }: AiModePageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const [profile, quizCatalog] = await Promise.all([getAiProfile(user.id), getQuizCatalog()]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <AiModeExperience
        initialMode={params.mode === "listen" ? "listen" : "watch"}
        initialStart={params.start === "quiz" || params.start === "chat" ? params.start : undefined}
        initialWatch={profile.watch}
        initialListen={profile.listen}
        chatEnabled={isAiConfigured()}
        quizCatalog={quizCatalog}
      />
    </div>
  );
}
