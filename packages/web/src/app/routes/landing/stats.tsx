const stats = [
  { value: "7", label: "Sort Bins" },
  { value: "13", label: "Rule Operators" },
  { value: "8", label: "Card Fields" },
  { value: "768", label: "Vector Dimensions" },
];

export function LandingStats() {
  return (
    <div className="border-y border-zinc-900 bg-zinc-900 grid grid-cols-4 max-sm:grid-cols-2 gap-px">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-neutral-950 px-16 py-10 text-center max-sm:px-4 max-sm:py-7"
        >
          <div className="font-heading text-[2.5rem] font-extrabold text-primary leading-none">
            {stat.value}
          </div>
          <div className="font-heading text-[0.65rem] tracking-[0.15em] text-zinc-400 mt-[0.4rem]">
            {stat.label.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
}
