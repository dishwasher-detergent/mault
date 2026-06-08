import { Link } from "react-router-dom";

interface LandingNavProps {
  isSignedIn: boolean;
  onSignOut: () => void;
}

export function LandingNav({ isSignedIn, onSignOut }: LandingNavProps) {
  return (
    <nav className="flex items-center justify-between px-10 py-6 border-b border-neutral-800 max-sm:px-5 max-sm:py-4">
      <span className="font-heading font-bold text-base tracking-[0.12em] text-primary">
        MAULT
      </span>

      <div className="flex gap-3 items-center">
        <a
          href="https://github.com/dishwasher-detergent/mault"
          target="_blank"
          rel="noopener noreferrer"
          className="max-sm:hidden text-zinc-400 no-underline text-[0.8rem] font-heading tracking-[0.08em] transition-colors duration-150 hover:text-white"
        >
          GITHUB
        </a>
        <a
          href="https://makerworld.com/en/models/2484318-horizontal-card-divider-for-storage-box#profileId-2728971"
          target="_blank"
          rel="noopener noreferrer"
          className="max-sm:hidden text-zinc-400 no-underline text-[0.8rem] font-heading tracking-[0.08em] transition-colors duration-150 hover:text-white"
        >
          3D MODEL
        </a>
        <div className="max-sm:hidden w-px h-4 bg-zinc-800" />

        {isSignedIn ? (
          <>
            <button
              onClick={onSignOut}
              className="bg-transparent border-none cursor-pointer text-neutral-400 text-[0.8rem] font-heading tracking-[0.08em] p-0 transition-colors duration-150 hover:text-white"
            >
              SIGN OUT
            </button>
            <Link
              to="/app"
              className="bg-primary text-primary-foreground no-underline text-[0.8rem] font-heading tracking-[0.08em] px-5 py-2 rounded-[0.3rem] transition-colors duration-150 hover:bg-primary/80"
            >
              GO TO APP
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/auth/sign-in"
              className="text-neutral-400 no-underline text-[0.8rem] font-heading tracking-[0.08em] transition-colors duration-150 hover:text-white"
            >
              SIGN IN
            </Link>
            <Link
              to="/auth/sign-up"
              className="bg-primary text-primary-foreground no-underline text-[0.8rem] font-heading tracking-[0.08em] px-5 py-2 rounded-[0.3rem] transition-colors duration-150 hover:bg-primary/80"
            >
              GET STARTED
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
