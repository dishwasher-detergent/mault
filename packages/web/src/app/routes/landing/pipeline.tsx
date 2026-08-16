import {
  IconCameraSpark,
  IconLayoutGrid,
  IconRoute,
  IconSparkles,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const STEPS = [
  { key: "showCard", icon: IconCameraSpark },
  { key: "recognized", icon: IconSparkles },
  { key: "sorted", icon: IconRoute },
  { key: "organized", icon: IconLayoutGrid },
] as const;

export function LandingPipeline() {
  const { t } = useTranslation("landing");

  return (
    <section id="how-it-works" className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {t("pipeline.heading")}
          </h2>
          <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            {t("pipeline.subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <step.icon size={18} />
                </span>
                <span className="font-heading text-xs font-medium text-muted-foreground">
                  {t("pipeline.stepLabel", { number: i + 1 })}
                </span>
              </div>
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
