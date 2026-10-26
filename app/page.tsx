import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { FeaturesSection } from "@/components/landing/features-section";
import { HighlightsSection } from "@/components/landing/highlights-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { CommunitiesSection } from "@/components/landing/communities-section";
import { ReviewsSection } from "@/components/landing/reviews-section";
import { StatsSection } from "@/components/landing/stats-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { redirectAuthenticatedAway } from "@/lib/auth-guards";
import { LANDING_FEATURED_REVIEWS } from "@/lib/data/landing";

export default async function LandingPage() {
  await redirectAuthenticatedAway();

  return (
    <main className="flex w-full flex-col overflow-x-clip">
      <Navbar />
      <Hero />
      <FeaturesSection />
      <HighlightsSection />
      <HowItWorksSection />
      <CommunitiesSection />
      <ReviewsSection reviews={LANDING_FEATURED_REVIEWS} />
      <StatsSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
