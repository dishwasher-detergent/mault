import {
  IconAdjustments,
  IconAlbum,
  IconChartBar,
  IconDeviceDesktop,
  IconScan,
  IconStack2,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const FEATURES = [
  { key: "recognition", icon: IconScan },
  { key: "rules", icon: IconAdjustments },
  { key: "collections", icon: IconAlbum },
  { key: "insights", icon: IconChartBar },
  { key: "logging", icon: IconStack2 },
  { key: "hardware", icon: IconDeviceDesktop },
] as const;

export function LandingFeatures() {
  const { t } = useTranslation("landing");

  return (
    <section id="features" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {t("features.heading")}
          </h2>
          <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.key}
              className="flex flex-col gap-3 rounded-lg border bg-card p-5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <feature.icon size={18} />
              </span>
              <div>
                <p className="font-heading text-sm font-semibold">
                  {t(`features.items.${feature.key}.title`)}
                </p>
                <p className="mt-1 text-xs/relaxed text-muted-foreground">
                  {t(`features.items.${feature.key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
