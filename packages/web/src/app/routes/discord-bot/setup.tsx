import {
  IconKey,
  IconLink,
  IconSettingsBolt,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const STEP_ICONS = [IconKey, IconLink, IconSettingsBolt];

export function DiscordBotSetup() {
  const { t } = useTranslation("discordBot");
  const steps = t("setup.steps", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <section id="setup" className="border-t bg-secondary/20">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {t("setup.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm/relaxed text-muted-foreground">
          {t("setup.description")}
        </p>

        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? IconKey;
            return (
              <li
                key={step.title}
                className="flex flex-col gap-3 rounded-lg border bg-card p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs/relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
