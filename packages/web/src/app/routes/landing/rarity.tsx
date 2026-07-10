const RARITIES = [
  {
    key: "common",
    label: "Common",
    description: "The bulk of every collection, finally accounted for.",
  },
  {
    key: "uncommon",
    label: "Uncommon",
    description: "See exactly how many you've got of each.",
  },
  {
    key: "rare",
    label: "Rare",
    description: "Track your rares across every set you own.",
  },
  {
    key: "mythic",
    label: "Mythic",
    description: "Your best pulls, never lost in a shoebox again.",
  },
];

export function LandingRarity() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Your whole collection, at a glance
        </h2>
        <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
          Every card gets tagged with its rarity, set, and color as it's
          scanned, so you always know what you have — without digging through
          boxes to find out.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RARITIES.map((rarity) => (
          <div
            key={rarity.key}
            className="flex flex-col gap-3 rounded-lg border bg-card p-5 ring-1 ring-foreground/10"
          >
            <span
              className="size-6 rounded-full"
              style={{ backgroundColor: `var(--${rarity.key})` }}
            />
            <div>
              <p className="font-heading text-sm font-semibold">
                {rarity.label}
              </p>
              <p className="mt-1 text-xs/relaxed text-muted-foreground">
                {rarity.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
