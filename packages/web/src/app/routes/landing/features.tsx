import {
  IconAdjustments,
  IconChartBar,
  IconDeviceDesktop,
  IconFolders,
  IconScan,
  IconStack2,
} from "@tabler/icons-react";

const FEATURES = [
  {
    icon: IconScan,
    title: "Instant recognition",
    description:
      "No typing card names, no barcodes. Just show the card and Magic Vault knows what it is.",
  },
  {
    icon: IconAdjustments,
    title: "Rules you control",
    description:
      "Mix and match conditions - rarity, color, set, type and more - to route cards exactly where you want.",
  },
  {
    icon: IconFolders,
    title: "Multiple collections",
    description:
      "Keep separate collections for trade binders, decks, or storage boxes, and switch between them freely.",
  },
  {
    icon: IconChartBar,
    title: "Know what you own",
    description:
      "See counts, rarities, and sets across your whole library - no more guessing what's in the box.",
  },
  {
    icon: IconStack2,
    title: "Every card logged",
    description:
      "Each scan is saved automatically, so your collection stays accurate without extra bookkeeping.",
  },
  {
    icon: IconDeviceDesktop,
    title: "Built for the table",
    description:
      "Pairs with a physical sorter, so cards land in real bins - not just another spreadsheet.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Everything you need to get organized
        </h2>
        <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
          Magic Vault handles the sorting so you can spend more time playing and
          less time digging through boxes.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col gap-3 rounded-lg border bg-card p-5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <feature.icon size={18} />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">
                {feature.title}
              </p>
              <p className="mt-1 text-xs/relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
