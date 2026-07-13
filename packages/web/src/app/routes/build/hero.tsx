const MODULES = [
  { name: "Module 1", bins: [1, 2] },
  { name: "Module 2", bins: [3, 4] },
  { name: "Module 3", bins: [5, 6] },
] as const;

export function BuildHero() {
  return (
    <section className="mx-auto max-w-4xl px-4 pt-12 pb-16">
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        Build the card sorter
      </h1>
      <p className="mt-4 max-w-2xl text-sm/relaxed text-muted-foreground md:text-base/relaxed">
        Parts list and assembly instructions for the physical sorting unit: a
        hopper feeds cards one at a time through three stacked routing modules,
        each capable of dropping a card into one of two side bins or passing it
        down to the next module — seven bins total, driven by an Arduino Uno R4
        Minima over I²C.
      </p>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
        <span>
          Firmware{" "}
          <code className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">
            arduino/main/main.ino
          </code>
        </span>
        <span>
          Enclosure{" "}
          <a
            href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/Card%20Sorter.f3d"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground hover:bg-secondary"
          >
            <code>3d model/Card Sorter.f3d</code>
          </a>
        </span>
        <span>
          Calibration{" "}
          <code className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">
            /app/calibrate
          </code>
        </span>
      </div>

      <div className="mt-10 overflow-hidden rounded-lg border bg-card">
        <div className="divide-y divide-border">
          <p className="p-5 text-xs/relaxed text-muted-foreground md:p-6">
            Each module has three servos — a{" "}
            <strong className="font-medium text-foreground">bottom</strong>{" "}
            trapdoor, a{" "}
            <strong className="font-medium text-foreground">paddle</strong>{" "}
            gate, and a left/right{" "}
            <strong className="font-medium text-foreground">pusher</strong> —
            plus an IR sensor. Closing every trapdoor above the target bin and
            opening only the ones beneath it lets a card fall to the right
            module before the pusher ejects it.
          </p>

          {MODULES.map((m) => (
            <div
              key={m.name}
              className="grid grid-cols-[110px_1fr_1fr] divide-x divide-border"
            >
              <div className="flex items-center justify-center bg-secondary/40 px-3 py-3 font-mono text-xs font-medium">
                {m.name}
              </div>
              {m.bins.map((bin) => (
                <div
                  key={bin}
                  className="flex items-center justify-center dark:bg-primary/15 bg-primary/5 px-3 py-3 font-mono text-xs font-semibold dark:text-primary-foreground text-primary"
                >
                  Bin {bin}
                </div>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-[110px_1fr] divide-x divide-border">
            <div className="bg-secondary/20" />
            <div className="flex items-center justify-center gap-2 dark:bg-primary/15 bg-primary/5 px-3 py-3 font-mono text-xs font-semibold dark:text-primary-foreground text-primary">
              Bin 7
              <span className="font-sans text-[10px] font-normal dark:text-primary-foreground/70 text-primary/70">
                — catch-all, all three bottoms open
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
