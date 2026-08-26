import {
  IconAlertTriangle,
  IconChartBar,
  IconMoodSmile,
  IconPhotoCog,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const FEATURE_ICONS = [
  IconPhotoCog,
  IconAlertTriangle,
  IconChartBar,
  IconMoodSmile,
] as const;

export function DiscordBotFeatures() {
  const { t } = useTranslation("discordBot");
  const features = t("features.items", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <section id="features" className="border-t bg-secondary/20">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {t("features.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm/relaxed text-muted-foreground">
          {t("features.description")}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i] ?? IconPhotoCog;
            return (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-lg border bg-card p-5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="text-xs/relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
