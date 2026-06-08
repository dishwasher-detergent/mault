import { Link } from "react-router-dom";

interface LandingHeroProps {
  isSignedIn: boolean;
  onSignOut: () => void;
}

export function LandingHero({ isSignedIn, onSignOut }: LandingHeroProps) {
  return (
    <section className="px-10 pt-24 pb-20 max-w-[1200px] mx-auto max-sm:px-5 max-sm:pt-12 max-sm:pb-10">
      <div className="inline-block bg-primary text-primary-foreground font-heading text-[0.7rem] tracking-[0.18em] px-[0.9rem] py-[0.35rem] rounded-full mb-8 font-semibold">
        OPEN SOURCE · MTG SORTER
      </div>

      <h1 className="font-heading text-[clamp(3rem,10vw,8rem)] font-extrabold leading-[0.92] tracking-[-0.03em] mb-6 text-neutral-100">
        SORT YOUR
        <br />
        <span className="text-primary">COLLECTION</span>
        <br />
        AT THE SPEED
        <br />
        OF SIGHT.
      </h1>

      <p className="font-sans text-[1.05rem] text-zinc-400 max-w-[520px] leading-[1.65] mb-10">
        Point a webcam at your cards. Machine learning identifies each one in
        milliseconds. A physical servo controller routes them into labeled
        bins — automatically.
      </p>

      <div className="flex gap-4 flex-wrap">
        {isSignedIn ? (
          <>
            <Link
              to="/app"
              className="bg-primary text-primary-foreground no-underline font-heading font-bold text-[0.85rem] tracking-[0.1em] px-9 py-4 rounded-[0.4rem] inline-block transition-all duration-150 hover:bg-primary/80 hover:-translate-y-px"
            >
              GO TO APP
            </Link>
            <button
              onClick={onSignOut}
              className="bg-transparent text-neutral-100 font-heading font-bold text-[0.85rem] tracking-[0.1em] px-9 py-4 rounded-[0.4rem] border border-zinc-800 cursor-pointer transition-all duration-150 hover:border-zinc-600 hover:-translate-y-px"
            >
              SIGN OUT
            </button>
          </>
        ) : (
          <>
            <Link
              to="/auth/sign-up"
              className="bg-primary text-primary-foreground no-underline font-heading font-bold text-[0.85rem] tracking-[0.1em] px-9 py-4 rounded-[0.4rem] inline-block transition-all duration-150 hover:bg-primary/80 hover:-translate-y-px"
            >
              START SORTING
            </Link>
            <Link
              to="/auth/sign-in"
              className="bg-transparent text-neutral-100 no-underline font-heading font-bold text-[0.85rem] tracking-[0.1em] px-9 py-4 rounded-[0.4rem] border border-zinc-800 inline-block transition-all duration-150 hover:border-zinc-600 hover:-translate-y-px"
            >
              SIGN IN
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
