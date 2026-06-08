export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-900 px-10 py-8 flex items-center justify-between flex-wrap gap-4 max-sm:px-5 max-sm:py-6 max-sm:flex-col max-sm:items-start">
      <span className="font-heading text-[0.75rem] text-neutral-500 tracking-[0.1em]">
        MAULT
      </span>

      <div className="flex gap-6 items-center max-sm:flex-col max-sm:gap-[0.6rem]">
        <a
          href="https://github.com/dishwasher-detergent/mault"
          target="_blank"
          rel="noopener noreferrer"
          className="font-heading text-[0.65rem] text-zinc-400 tracking-[0.1em] no-underline transition-colors duration-150 hover:text-white"
        >
          GITHUB
        </a>
        <a
          href="https://makerworld.com/en/models/2484318-horizontal-card-divider-for-storage-box#profileId-2728971"
          target="_blank"
          rel="noopener noreferrer"
          className="font-heading text-[0.65rem] text-zinc-400 tracking-[0.1em] no-underline transition-colors duration-150 hover:text-white"
        >
          3D MODEL
        </a>
        <span className="font-heading text-[0.65rem] text-neutral-500 tracking-[0.08em]">
          NOT AFFILIATED WITH WIZARDS OF THE COAST
        </span>
      </div>
    </footer>
  );
}
