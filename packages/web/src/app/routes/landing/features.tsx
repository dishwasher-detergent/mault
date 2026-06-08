const features = [
  {
    number: "01",
    title: "Vision-Powered Scanning",
    body: "Point your webcam at any card. OpenCV detects the border, our AI model identifies it in milliseconds using 768-dimensional image embeddings.",
    cardClass: "bg-primary text-primary-foreground",
  },
  {
    number: "02",
    title: "Rule-Based Sorting",
    body: "Define up to 7 physical bins with nested AND/OR rule trees. Filter by color, rarity, CMC, type, set, value — anything on the card.",
    cardClass: "bg-amber-500 text-neutral-950",
  },
  {
    number: "03",
    title: "Hardware Control",
    body: "Paired with an Arduino servo controller over Web Serial API. Sort decisions become physical motion — automatically routed to the right bin.",
    cardClass: "bg-red-600 text-white",
  },
];

export function LandingFeatures() {
  return (
    <section className="px-10 py-24 max-w-[1200px] mx-auto max-sm:px-5 max-sm:py-14">
      <p className="font-heading text-[0.7rem] tracking-[0.2em] text-zinc-400 mb-4">
        FEATURES
      </p>
      <h2 className="font-heading text-[clamp(2rem,5vw,3.5rem)] font-extrabold tracking-[-0.02em] text-neutral-100 mb-14 leading-[1.05]">
        EVERYTHING YOU NEED
        <br />
        TO SORT SMARTER.
      </h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 max-sm:grid-cols-1">
        {features.map((f) => (
          <div
            key={f.number}
            className={`rounded-xl p-10 flex flex-col gap-5 max-sm:p-7 ${f.cardClass}`}
          >
            <span className="font-heading text-[0.7rem] tracking-[0.18em] font-semibold">
              {f.number}
            </span>
            <h3 className="font-heading text-[1.35rem] font-extrabold tracking-[-0.01em] leading-[1.15] m-0">
              {f.title.toUpperCase()}
            </h3>
            <p className="font-sans text-[0.9rem] leading-[1.65] m-0">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
