import { OnboardingSkeleton } from "@/components/skeletons/page-skeletons";

export default function Loading() {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center bg-[#0a0416] px-4 py-8 sm:px-6">
      <header className="flex w-full max-w-[1100px] items-center justify-center pb-8 sm:pb-10">
        <span className="text-gradient-brand text-2xl font-semibold">AniVerse</span>
      </header>
      <OnboardingSkeleton />
    </main>
  );
}
