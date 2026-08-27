import {
  IconLayoutGrid,
  IconRoute,
  IconSparkles,
  IconStack2,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const STEPS = [
  { key: "showCard", icon: IconStack2 },
  { key: "recognized", icon: IconSparkles },
  { key: "sorted", icon: IconRoute },
  { key: "organized", icon: IconLayoutGrid },
] as const;

export function LandingPipeline() {
  const { t } = useTranslation("landing");

  return (
    <section id="how-it-works" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
            {t("pipeline.heading")}
          </h2>
          <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            {t("pipeline.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid divide-y divide-border border-t border-border md:grid-cols-4 md:divide-x md:divide-y-0 md:border-t-0">
          {STEPS.map((step, i) => (
            <div
              key={step.key}
              className="flex flex-col items-start gap-3 py-6 md:px-6 md:py-0 md:first:pl-0 md:last:pr-0"
            >
              <span className="font-heading text-xs font-medium text-muted-foreground">
                {t("pipeline.stepLabel", { number: i + 1 })}
              </span>
              <step.icon size={20} className="text-primary" />
              <p className="font-heading text-sm font-semibold">
                {t(`pipeline.steps.${step.key}.title`)}
              </p>
              <p className="text-xs/relaxed text-muted-foreground">
                {t(`pipeline.steps.${step.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
