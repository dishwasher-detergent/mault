import { neon } from "@/lib/auth/client";
import { useNavigate } from "react-router-dom";
import { LandingCta } from "./landing/cta";
import { LandingFeatures } from "./landing/features";
import { LandingFooter } from "./landing/footer";
import { LandingHero } from "./landing/hero";
import { LandingNav } from "./landing/nav";
import { LandingPipeline } from "./landing/pipeline";
import { LandingRarity } from "./landing/rarity";
import { LandingStats } from "./landing/stats";
import { responsiveStyles } from "./landing/styles";

export default function LandingPage() {
  const { data, isPending } = neon.auth.useSession();
  const isSignedIn = !isPending && !!data?.user;
  const navigate = useNavigate();

  async function handleSignOut() {
    await neon.auth.signOut();
    navigate("/");
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "#0a0a0a", color: "#f5f5f5" }}
    >
      <style>{responsiveStyles}</style>
      <LandingNav isSignedIn={isSignedIn} onSignOut={handleSignOut} />
      <LandingHero isSignedIn={isSignedIn} onSignOut={handleSignOut} />
      <LandingStats />
      <LandingFeatures />
      <LandingPipeline />
      <LandingRarity />
      <LandingCta isSignedIn={isSignedIn} />
      <LandingFooter />
    </div>
  );
}
