import {
  IconCamera,
  IconLayoutGrid,
  IconRoute,
  IconSparkles,
} from "@tabler/icons-react";

const STEPS = [
  {
    icon: IconCamera,
    title: "Show it a card",
    description:
      "Hold any card up to your webcam — no scanner or app on your phone required.",
  },
  {
    icon: IconSparkles,
    title: "It's recognized instantly",
    description:
      "Magic Vault matches it against the full card database in a moment, rarity, set and all.",
  },
  {
    icon: IconRoute,
    title: "Sorted by your rules",
    description:
      "Set up rules once — by rarity, color, set, type, or anything else — and every card routes itself.",
  },
  {
    icon: IconLayoutGrid,
    title: "Always organized",
    description:
      "Every card is logged and searchable, across as many collections as you keep.",
  },
];

export function LandingPipeline() {
  return (
    <section id="how-it-works" className="bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            How it works
          </h2>
          <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            From loose pile to organized collection in four simple steps.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <step.icon size={18} />
                </span>
                <span className="font-heading text-xs font-medium text-muted-foreground">
                  Step {i + 1}
                </span>
              </div>
              <p className="font-heading text-sm font-semibold">
                {step.title}
              </p>
              <p className="text-xs/relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
