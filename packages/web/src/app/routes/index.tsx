import { LandingCta } from "@/app/routes/landing/cta";
import { LandingFeatures } from "@/app/routes/landing/features";
import { LandingFooter } from "@/app/routes/landing/footer";
import { LandingHero } from "@/app/routes/landing/hero";
import { LandingNav } from "@/app/routes/landing/nav";
import { LandingOpenSource } from "@/app/routes/landing/open-source";
import { LandingPipeline } from "@/app/routes/landing/pipeline";
import { LandingRarity } from "@/app/routes/landing/rarity";
import { LandingStats } from "@/app/routes/landing/stats";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <LandingStats />
        <LandingRarity />
        <LandingPipeline />
        <LandingFeatures />
        <LandingOpenSource />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
