import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, type ReactNode } from "react";

interface Row {
  key: string;
  qty: string;
  part: ReactNode;
  notes: ReactNode;
}

interface Group {
  title: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    title: "Electronics",
    rows: [
      {
        key: "arduino",
        qty: "1",
        part: (
          <>
            Arduino Uno R4 Minima{" "}
            <span className="text-muted-foreground">(ABX0080)</span>
          </>
        ),
        notes:
          "Runs arduino/main/main.ino; USB connection to the host computer for Web Serial",
      },
      {
        key: "pca9685",
        qty: "1",
        part: "Adafruit PCA9685 16-channel 12-bit PWM/servo driver",
        notes: "I²C servo driver — drives all 10 servos",
      },
      {
        key: "sg90-positional",
        qty: "9",
        part: "SG90 micro servo, positional (180°)",
        notes:
          "3 per module × 3 modules — bottom trapdoor, paddle gate, pusher",
      },
      {
        key: "sg90-continuous",
        qty: "1",
        part: "SG90 servo, modified for continuous rotation",
        notes: "Feeder — drives cards out of the hopper into module 1",
      },
    ],
  },
  {
    title: "Sensing",
    rows: [
      {
        key: "ir-sensor",
        qty: "4",
        part: (
          <>
            Reflective/obstacle IR sensor module{" "}
            <span className="text-muted-foreground">
              (3-pin: VCC, GND, digital OUT)
            </span>
          </>
        ),
        notes:
          "One at the gate of modules 1, 2, 3, plus one in the hopper throat",
      },
    ],
  },
  {
    title: "Power",
    rows: [
      {
        key: "psu",
        qty: "1",
        part: "5V regulated power supply, 4–10A",
        notes:
          "Dedicated servo bus power into the PCA9685 V+ terminal — do not power 10 servos off the Arduino's onboard 5V",
      },
      {
        key: "usb-cable",
        qty: "1",
        part: "USB-A–to–USB-C cable",
        notes: "Arduino Uno R4 Minima ↔ host computer",
      },
      {
        key: "barrel-jack",
        qty: "1",
        part: "DC barrel jack or screw-terminal pigtail",
        notes: "Adapts the PSU output to the PCA9685's V+ / GND terminal",
      },
    ],
  },
  {
    title: "Structural",
    rows: [
      {
        key: "enclosure",
        qty: "1 set",
        part: "3D-printed enclosure & module housings",
        notes: (
          <>
            Print from{" "}
            <a
              href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/card_sorter.3mf"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              card_sorter.3mf
            </a>{" "}
            (mesh, slicer-ready) or{" "}
            <a
              href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/Card%20Sorter.f3d"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Card Sorter.f3d
            </a>{" "}
            (Fusion 360 source)
          </>
        ),
      },
      {
        key: "filament",
        qty: "—",
        part: "PLA or PETG filament",
        notes: "Quantity per your slicer's estimate for the model above",
      },
      {
        key: "o-ring",
        qty: "6",
        part: "G20 o-ring",
        notes: "Fitted onto the feeder roller for grip on the card face",
      },
    ],
  },
  {
    title: "Fasteners & wiring supplies",
    rows: [
      {
        key: "m3x6-screw",
        qty: "22",
        part: "M3×6 screw",
        notes:
          "14 attach each bin base to the housing; 8 attach the base panels to the base",
      },
      {
        key: "m3-nut",
        qty: "8",
        part: "M3 nut",
        notes: "Paired with the base panel M3×6 screws",
      },
      {
        key: "m3x8-screw",
        qty: "2",
        part: "M3×8 screw",
        notes: "Attaches the hopper tube",
      },
      {
        key: "m2x4-screw",
        qty: "33",
        part: (
          <>
            M2×4 screw{" "}
            <span className="text-muted-foreground">(11 per module)</span>
          </>
        ),
        notes:
          "Per module: flapper (bottom/sides), pusher arms, and IR sensor mounts",
      },
      {
        key: "m2x6-screw",
        qty: "8",
        part: "M2×6 screw",
        notes: "Mounts the Arduino and PCA9685 servo driver board to the base panels",
      },
      {
        key: "servo-horn-screw",
        qty: "10",
        part: "Servo horn screw (Included with servos)",
        notes: "Included with each servo; secures the horn to the shaft",
      },
      {
        key: "hookup-wire",
        qty: "1 roll",
        part: "22–24 AWG hookup wire",
        notes: "IR sensor",
      },
    ],
  },
];

const STORAGE_KEY = "magic-vault:build-parts-checklist";

function usePartsChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore unavailable storage
      }
      return next;
    });
  };

  return { checked, toggle };
}

function GroupTable({
  group,
  checked,
  toggle,
}: {
  group: Group;
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {group.title}
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-120 border-collapse text-xs/relaxed">
          <thead>
            <tr className="bg-secondary/40">
              <th className="w-8 border-b px-3 py-2" />
              <th className="w-16 border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Qty
              </th>
              <th className="border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Part
              </th>
              <th className="border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, i) => (
              <tr
                key={row.key}
                className={cn(
                  "hover:bg-secondary/30",
                  i !== group.rows.length - 1 && "border-b",
                )}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Have ${row.qty === "—" ? "" : row.qty} part`}
                    checked={!!checked[row.key]}
                    onChange={() => toggle(row.key)}
                    className="size-4 accent-primary"
                  />
                </td>
                <td className="px-3 py-2.5 font-mono text-muted-foreground tabular-nums">
                  {row.qty}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 font-medium",
                    checked[row.key] &&
                      "text-muted-foreground line-through decoration-muted-foreground/50",
                  )}
                >
                  {row.part}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {row.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BuildBom() {
  const { checked, toggle } = usePartsChecklist();

  const allRows = useMemo(() => GROUPS.flatMap((g) => g.rows), []);
  const doneCount = allRows.filter((r) => checked[r.key]).length;
  const pct = allRows.length
    ? Math.round((doneCount / allRows.length) * 100)
    : 0;

  return (
    <section id="parts" className="mx-auto max-w-4xl px-4 py-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        Bill of materials
      </h2>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-muted-foreground">
        Quantities match the firmware exactly — 3 modules × 3 servos, 1 feeder,
        4 IR sensors, 10 of the PCA9685's 16 channels in use. Channels 0–3 are
        wired for status LEDs in firmware but aren't part of the current build.
        Check off each part as you gather it — checkmarks are saved in this
        browser.
      </p>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>
            {doneCount} of {allRows.length} parts
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {GROUPS.map((group) => (
          <GroupTable
            key={group.title}
            group={group}
            checked={checked}
            toggle={toggle}
          />
        ))}
      </div>
    </section>
  );
}
