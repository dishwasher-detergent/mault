const steps = [
  { label: "Webcam captures card", icon: "▶" },
  { label: "OpenCV isolates artwork", icon: "◈" },
  { label: "SigLIP finds the match", icon: "◉" },
  { label: "Rules assign a bin", icon: "◎" },
  { label: "Arduino routes the card", icon: "◆" },
];

export function LandingPipeline() {
  return (
    <section className="bg-neutral-950 border-y border-zinc-900 px-10 py-24 max-sm:px-5 max-sm:py-14">
      <div className="max-w-[1200px] mx-auto">
        <p className="font-heading text-[0.7rem] tracking-[0.2em] text-zinc-400 mb-4">
          THE PIPELINE
        </p>
        <h2 className="font-heading text-[clamp(2rem,5vw,3.5rem)] font-extrabold tracking-[-0.02em] text-neutral-100 mb-16 leading-[1.05]">
          FROM LENS
          <br />
          TO BIN.
        </h2>

        <div className="flex items-center flex-wrap max-sm:flex-col max-sm:items-stretch">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center flex-1 min-w-[140px] max-sm:flex-none max-sm:w-full max-sm:flex-col"
            >
              <div className="flex flex-col items-center gap-3 flex-1 py-6 px-2 max-sm:flex-row max-sm:items-center max-sm:py-2 max-sm:px-0 max-sm:gap-4">
                <div
                  className={`w-13 h-13 shrink-0 rounded-full flex items-center justify-center font-heading text-[1.1rem] font-bold border-2 ${
                    i === 0
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-zinc-900 border-zinc-800 text-neutral-500"
                  }`}
                >
                  {step.icon}
                </div>
                <span className="font-heading text-[0.65rem] tracking-[0.1em] text-zinc-400 text-center leading-[1.4] max-sm:text-left">
                  {step.label.toUpperCase()}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="shrink-0 h-px w-8 bg-zinc-800 self-center -mt-6 max-sm:w-px max-sm:h-6 max-sm:ml-[25px] max-sm:mt-0 max-sm:self-auto" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
