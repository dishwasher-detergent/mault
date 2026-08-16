import {
  MAX_MODULES,
  MIN_MODULES,
  useModuleCount,
} from "@/app/routes/build/use-module-count";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconExternalLink, IconMinus, IconPlus } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

type BuildT = TFunction<"build">;

interface Row {
  key: string;
  qty: (moduleCount: number) => string;
  name: string;
  part: (t: BuildT) => ReactNode;
  notes: (t: BuildT, moduleCount: number) => ReactNode;
  buyUrl?: string;
}

interface Group {
  key: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    key: "electronics",
    rows: [
      {
        key: "arduino",
        qty: () => "1",
        name: "Arduino Uno R4 Minima",
        part: () => (
          <>
            Arduino Uno R4 Minima{" "}
            <span className="text-muted-foreground">(ABX0080)</span>
          </>
        ),
        notes: (t) => (
          <Trans
            t={t}
            i18nKey="bom.groups.electronics.items.arduino.notes"
            values={{ path: "arduino/main/main.ino" }}
            components={{
              code: <code className="font-mono text-[11px]" />,
            }}
          />
        ),
        buyUrl: "https://www.amazon.com/dp/B0C78K4CD4",
      },
      {
        key: "pca9685",
        qty: () => "1",
        name: "Adafruit PCA9685",
        part: (t) => t("bom.groups.electronics.items.pca9685.part"),
        notes: (t) => t("bom.groups.electronics.items.pca9685.notes"),
        buyUrl: "https://www.amazon.com/dp/B0CNVBWX2M",
      },
      {
        key: "sg90-positional",
        qty: (n) => String(n * 3),
        name: "SG90 micro servo, positional",
        part: (t) => t("bom.groups.electronics.items.sg90Positional.part"),
        notes: (t, n) =>
          t("bom.groups.electronics.items.sg90Positional.notes", {
            count: n,
          }),
        buyUrl: "https://www.amazon.com/dp/B07L2SF3R4",
      },
      {
        key: "sg90-continuous",
        qty: () => "1",
        name: "SG90 servo, continuous rotation",
        part: (t) => t("bom.groups.electronics.items.sg90Continuous.part"),
        notes: (t) => t("bom.groups.electronics.items.sg90Continuous.notes"),
        buyUrl: "https://www.amazon.com/dp/B086ZGTLZB",
      },
    ],
  },
  {
    key: "sensing",
    rows: [
      {
        key: "ir-sensor",
        qty: (n) => String(n + 1),
        name: "Reflective/obstacle IR sensor module",
        part: (t) => (
          <>
            {t("bom.groups.sensing.items.irSensor.part")}{" "}
            <span className="text-muted-foreground">
              {t("bom.groups.sensing.items.irSensor.partSpec")}
            </span>
          </>
        ),
        notes: (t, n) =>
          t("bom.groups.sensing.items.irSensor.notes", { count: n }),
        buyUrl: "https://www.amazon.com/dp/B0CWKWWKYL",
      },
    ],
  },
  {
    key: "power",
    rows: [
      {
        key: "psu",
        qty: () => "1",
        name: "6V Power Supply",
        part: (t) => t("bom.groups.power.items.psu.part"),
        notes: (t) => t("bom.groups.power.items.psu.notes"),
        buyUrl: "https://www.amazon.com/dp/B0B2DZJQCR",
      },
      {
        key: "usb-cable",
        qty: () => "1",
        name: "USB-A-to-USB-C cable",
        part: (t) => t("bom.groups.power.items.usbCable.part"),
        notes: (t) => t("bom.groups.power.items.usbCable.notes"),
      },
      {
        key: "barrel-jack",
        qty: () => "1",
        name: "DC barrel jack or screw-terminal pigtail",
        part: (t) => t("bom.groups.power.items.barrelJack.part"),
        notes: (t) => t("bom.groups.power.items.barrelJack.notes"),
        buyUrl: "https://www.amazon.com/dp/B0CR8TZ41W",
      },
    ],
  },
  {
    key: "structural",
    rows: [
      {
        key: "enclosure",
        qty: () => "1 set",
        name: "3D-printed enclosure & module housings",
        part: (t) => t("bom.groups.structural.items.enclosure.part"),
        notes: (t) => (
          <Trans
            t={t}
            i18nKey="bom.groups.structural.items.enclosure.notes"
            components={{
              mesh: (
                <a
                  href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/card_sorter.3mf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                />
              ),
              source: (
                <a
                  href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/Card%20Sorter.f3d"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                />
              ),
            }}
          />
        ),
      },
      {
        key: "filament",
        qty: () => "-",
        name: "PLA or PETG filament",
        part: (t) => t("bom.groups.structural.items.filament.part"),
        notes: (t) => t("bom.groups.structural.items.filament.notes"),
        buyUrl: "https://www.amazon.com/dp/B0C14M5HR9",
      },
      {
        key: "o-ring",
        qty: () => "6",
        name: "20mm ID 26mm OD 3mm Width O-Ring",
        part: (t) => t("bom.groups.structural.items.oRing.part"),
        notes: (t) => t("bom.groups.structural.items.oRing.notes"),
        buyUrl:
          "https://www.amazon.com/uxcell-Silicone-Rings-Diameter-Gasket/dp/B07MNJXJSG",
      },
    ],
  },
  {
    key: "fasteners",
    rows: [
      {
        key: "m3x6-screw",
        qty: () => "22",
        name: "M3x6 screw",
        part: (t) => t("bom.groups.fasteners.items.m3x6Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3x6Screw.notes"),
        buyUrl: "https://www.amazon.com/dp/B0CGNP4RXK",
      },
      {
        key: "m3-nut",
        qty: () => "8",
        name: "M3 nut",
        part: (t) => t("bom.groups.fasteners.items.m3Nut.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3Nut.notes"),
        buyUrl: "https://www.amazon.com/dp/B0CGNP4RXK",
      },
      {
        key: "m3x8-screw",
        qty: () => "2",
        name: "M3x8 screw",
        part: (t) => t("bom.groups.fasteners.items.m3x8Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3x8Screw.notes"),
        buyUrl: "https://www.amazon.com/dp/B0CGNP4RXK",
      },
      {
        key: "m2x4-screw",
        qty: (n) => String(n * 11),
        name: "M2x4 screw",
        part: (t) => (
          <>
            {t("bom.groups.fasteners.items.m2x4Screw.part")}{" "}
            <span className="text-muted-foreground">
              {t("bom.groups.fasteners.items.m2x4Screw.partSpec")}
            </span>
          </>
        ),
        notes: (t, n) =>
          t("bom.groups.fasteners.items.m2x4Screw.notes", { count: n }),
        buyUrl: "https://www.amazon.com/dp/B0CGNP4RXK",
      },
      {
        key: "m2x6-screw",
        qty: () => "8",
        name: "M2x6 screw",
        part: (t) => t("bom.groups.fasteners.items.m2x6Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m2x6Screw.notes"),
        buyUrl: "https://www.amazon.com/dp/B0CGNP4RXK",
      },
      {
        key: "servo-horn-screw",
        qty: (n) => String(n * 3 + 1),
        name: "Servo horn screw",
        part: (t) => t("bom.groups.fasteners.items.servoHornScrew.part"),
        notes: (t) => t("bom.groups.fasteners.items.servoHornScrew.notes"),
      },
      {
        key: "hookup-wire",
        qty: () => "1 roll",
        name: "Low Voltage Wire",
        part: (t) => t("bom.groups.fasteners.items.hookupWire.part"),
        notes: (t) => t("bom.groups.fasteners.items.hookupWire.notes"),
        buyUrl:
          "https://www.amazon.com/dp/B01EV70C78?ref_=ppx_hzsearch_conn_dt_b_fed_asin_title_9",
      },
      {
        key: "dupont-connectors",
        qty: () => "~50",
        name: "Dupont Connectors",
        part: (t) => t("bom.groups.fasteners.items.dupontConnectors.part"),
        notes: (t) => t("bom.groups.fasteners.items.dupontConnectors.notes"),
        buyUrl: "https://www.amazon.com/dp/B07QGBKFYZ",
      },
      {
        key: "dupont-crimper",
        qty: () => "1",
        name: "Dupont Crimper",
        part: (t) => t("bom.groups.fasteners.items.dupontCrimper.part"),
        notes: (t) => t("bom.groups.fasteners.items.dupontCrimper.notes"),
        buyUrl: "https://www.amazon.com/dp/B0D1FR76Q7",
      },
    ],
  },
  {
    key: "optional",
    rows: [
      {
        key: "webcam",
        qty: () => "1",
        name: "Webcam",
        part: (t) => t("bom.groups.optional.items.webcam.part"),
        notes: (t) => t("bom.groups.optional.items.webcam.notes"),
        buyUrl:
          "https://www.amazon.com/Logitech-C920x-Pro-HD-Webcam/dp/B085TFF7M1",
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
    } catch {}
  }, []);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return { checked, toggle };
}

function GroupTable({
  group,
  moduleCount,
  checked,
  toggle,
}: {
  group: Group;
  moduleCount: number;
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
}) {
  const { t } = useTranslation("build");

  return (
    <div>
      <h3 className="mb-2 font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t(`bom.groups.${group.key}.title`)}
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-120 border-collapse text-xs/relaxed">
          <thead>
            <tr className="bg-secondary/40">
              <th className="w-8 border-b px-3 py-2" />
              <th className="w-16 border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("bom.table.qty")}
              </th>
              <th className="border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("bom.table.part")}
              </th>
              <th className="border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("bom.table.notes")}
              </th>
              <th className="w-12 border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("bom.table.buy")}
              </th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, i) => {
              const qty = row.qty(moduleCount);
              return (
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
                      aria-label={t("bom.checkboxAriaLabel", {
                        qty: qty === "-" ? "" : qty,
                      })}
                      checked={!!checked[row.key]}
                      onChange={() => toggle(row.key)}
                      className="size-4 accent-primary"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground tabular-nums">
                    {qty}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 font-medium",
                      checked[row.key] &&
                        "text-muted-foreground line-through decoration-muted-foreground/50",
                    )}
                  >
                    {row.part(t)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {row.notes(t, moduleCount)}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.buyUrl && (
                      <a
                        href={row.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("bom.buyAriaLabel", { part: row.name })}
                        className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <IconExternalLink size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BuildBom() {
  const { t } = useTranslation("build");
  const { checked, toggle } = usePartsChecklist();
  const { moduleCount, setModuleCount } = useModuleCount();

  const allRows = useMemo(() => GROUPS.flatMap((g) => g.rows), []);
  const doneCount = allRows.filter((r) => checked[r.key]).length;
  const pct = allRows.length
    ? Math.round((doneCount / allRows.length) * 100)
    : 0;

  const channelsUsed = moduleCount * 3 + 1;

  return (
    <section id="parts" className="mx-auto max-w-4xl px-4 py-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {t("bom.heading")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-muted-foreground">
        {t("bom.description", {
          modules: moduleCount,
          irSensors: moduleCount + 1,
          channelsUsed,
          channelsFree: 16 - channelsUsed,
        })}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("bom.moduleCount.label")}
        </span>
        <div className="flex items-center gap-1.5 rounded-md border p-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("bom.moduleCount.decreaseAria")}
            disabled={moduleCount <= MIN_MODULES}
            onClick={() => setModuleCount(moduleCount - 1)}
          >
            <IconMinus />
          </Button>
          <span className="w-4 text-center font-mono text-xs font-medium tabular-nums">
            {moduleCount}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("bom.moduleCount.increaseAria")}
            disabled={moduleCount >= MAX_MODULES}
            onClick={() => setModuleCount(moduleCount + 1)}
          >
            <IconPlus />
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>
            {t("bom.progress.partsCount", {
              done: doneCount,
              total: allRows.length,
            })}
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
            key={group.key}
            group={group}
            moduleCount={moduleCount}
            checked={checked}
            toggle={toggle}
          />
        ))}
      </div>
    </section>
  );
}
