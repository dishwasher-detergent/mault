import { Link } from "react-router-dom";

interface LandingCtaProps {
  isSignedIn: boolean;
}

export function LandingCta({ isSignedIn }: LandingCtaProps) {
  return (
    <section className="bg-primary px-10 py-24 text-center max-sm:px-5 max-sm:py-16">
      <h2 className="font-heading text-[clamp(2.5rem,8vw,6rem)] font-extrabold tracking-[-0.03em] text-primary-foreground leading-[0.95] mb-6">
        READY TO
        <br />
        START SORTING?
      </h2>
      <p className="font-sans text-[1.05rem] text-primary-foreground mb-10 leading-[1.6]">
        Create a free account and connect your hardware.
      </p>
      <Link
        to={isSignedIn ? "/app" : "/auth/sign-up"}
        className="bg-white text-primary no-underline font-heading font-extrabold text-[0.9rem] tracking-[0.12em] px-12 py-[1.1rem] rounded-[0.4rem] inline-block transition-all duration-150 hover:bg-primary/10 hover:-translate-y-0.5"
      >
        {isSignedIn ? "GO TO APP" : "CREATE ACCOUNT"}
      </Link>
    </section>
  );
}
