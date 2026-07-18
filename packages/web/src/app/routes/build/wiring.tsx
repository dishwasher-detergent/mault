import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function Pin({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </code>
  );
}

function MiniTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-100 border-collapse text-xs/relaxed">
        <thead>
          <tr className="bg-secondary/40">
            {columns.map((col) => (
              <th
                key={col}
                className="border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "hover:bg-secondary/30",
                i !== rows.length - 1 && "border-b",
              )}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CHANNEL_MAP: [string, string][] = [
  ["0", "Unused - reserved for LEDs in firmware, not part of this build"],
  ["1", "Unused - reserved for LEDs in firmware, not part of this build"],
  ["2", "Unused - reserved for LEDs in firmware, not part of this build"],
  ["3", "Unused - reserved for LEDs in firmware, not part of this build"],
  ["4", "Module 1 - bottom"],
  ["5", "Module 1 - paddle"],
  ["6", "Module 1 - pusher"],
  ["7", "Module 2 - bottom"],
  ["8", "Module 2 - paddle"],
  ["9", "Module 2 - pusher"],
  ["10", "Module 3 - bottom"],
  ["11", "Module 3 - paddle"],
  ["12", "Module 3 - pusher"],
  ["13", "Feeder (continuous rotation)"],
];

export function BuildWiring() {
  return (
    <section id="wiring" className="mx-auto max-w-4xl px-4 py-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        Wiring
      </h2>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-muted-foreground">
        Everything hangs off one I²C bus (PCA9685) and four digital input pins
        (IR sensors). The PCA9685's logic side runs off the Arduino's 5V; its{" "}
        <Pin>V+</Pin> servo rail must come from the external supply, and that
        supply's ground must be tied back to the Arduino's ground - a floating
        servo ground is the most common reason a freshly wired unit won't move.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <div>
          <h3 className="mb-2 font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            I²C bus
          </h3>
          <MiniTable
            columns={["PCA9685 pin", "Arduino Uno R4 Minima"]}
            rows={[
              [<Pin key="a">SDA</Pin>, <Pin key="b">SDA</Pin>],
              [<Pin key="a">SCL</Pin>, <Pin key="b">SCL</Pin>],
              ["VCC (logic)", <Pin key="b">5V</Pin>],
              [<Pin key="a">GND</Pin>, <Pin key="b">GND</Pin>],
            ]}
          />
        </div>

        <div>
          <h3 className="mb-2 font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Servo power
          </h3>
          <MiniTable
            columns={["From", "To"]}
            rows={[
              [
                "External 5V PSU, +",
                <>
                  PCA9685 <Pin>V+</Pin> terminal block
                </>,
              ],
              [
                "External 5V PSU, −",
                <>
                  PCA9685 <Pin>GND</Pin> terminal block{" "}
                  <em className="text-muted-foreground not-italic">and</em>{" "}
                  Arduino <Pin>GND</Pin>
                </>,
              ],
            ]}
          />
        </div>

        <div>
          <h3 className="mb-2 font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            IR sensors
          </h3>
          <p className="mb-3 text-xs/relaxed text-muted-foreground">
            All four read active-
            <strong className="text-foreground">LOW</strong> (pin goes low when
            a card is present) using the Arduino's internal pull-up - wire the
            sensor's digital <Pin>OUT</Pin> straight to the pin, no external
            pull-up resistor needed.
          </p>
          <MiniTable
            columns={["Sensor", "Arduino pin"]}
            rows={[
              ["Module 1 gate", <Pin key="p">D2</Pin>],
              ["Module 2 gate", <Pin key="p">D3</Pin>],
              ["Module 3 gate", <Pin key="p">D4</Pin>],
              ["Hopper throat", <Pin key="p">D5</Pin>],
            ]}
          />
        </div>

        <div>
          <h3 className="mb-2 font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            PCA9685 channel map
          </h3>
          <MiniTable
            columns={["Ch.", "Assignment"]}
            rows={CHANNEL_MAP.map(([ch, assignment]) => [
              <span key="ch" className="font-mono tabular-nums">
                {ch}
              </span>,
              assignment,
            ])}
          />
        </div>
      </div>
    </section>
  );
}
