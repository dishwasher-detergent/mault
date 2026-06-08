const rarities = [
  {
    label: "MYTHIC",
    desc: "Route chase rares to a dedicated bin automatically.",
    dotClass: "bg-mythic",
    textClass: "text-mythic",
    cardBg: "#1a1008",
  },
  {
    label: "RARE",
    desc: "Gold cards for your trade binder, sorted on the fly.",
    dotClass: "bg-rare",
    textClass: "text-rare",
    cardBg: "#18170a",
  },
  {
    label: "UNCOMMON",
    desc: "Silver cards neatly separated from the bulk.",
    dotClass: "bg-uncommon",
    textClass: "text-uncommon",
    cardBg: "#0a1018",
  },
  {
    label: "COMMON",
    desc: "Bulk commons sorted by color, CMC, or set.",
    dotClass: "bg-common",
    textClass: "text-common",
    cardBg: "#111",
  },
];

export function LandingRarity() {
  return (
    <section className="px-10 py-24 max-w-[1200px] mx-auto max-sm:px-5 max-sm:py-14">
      <p className="font-heading text-[0.7rem] tracking-[0.2em] text-zinc-400 mb-4">
        RULE ENGINE
      </p>
      <h2 className="font-heading text-[clamp(2rem,5vw,3.5rem)] font-extrabold tracking-[-0.02em] text-neutral-100 mb-12 leading-[1.05]">
        BUILD RULES,
        <br />
        NOT SPREADSHEETS.
      </h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-px bg-zinc-900 rounded-xl overflow-hidden">
        {rarities.map((rarity) => (
          <div
            key={rarity.label}
            className="flex flex-col gap-3 p-8 px-7"
            style={{ background: rarity.cardBg }}
          >
            <div className="flex items-center gap-[0.6rem]">
              <div className={`w-2 h-2 rounded-full shrink-0 ${rarity.dotClass}`} />
              <span className={`font-heading text-[0.75rem] tracking-[0.15em] font-bold ${rarity.textClass}`}>
                {rarity.label}
              </span>
            </div>
            <p className="font-sans text-[0.85rem] text-neutral-400 leading-[1.55] m-0">
              {rarity.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
