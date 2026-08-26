import { buttonVariants } from "@/components/ui/button";
import { DISCORD_URL, MODEL_URL, REPO_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import {
  IconBrandDiscord,
  IconBrandGithub,
  IconCube,
  IconDownload,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingOpenSource() {
  const { t } = useTranslation("landing");

  return (
    <section id="open-source" className="border-t bg-secondary/20">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {t("openSource.heading")}
          </h2>
          <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            {t("openSource.subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <IconBrandGithub size={18} />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">
                {t("openSource.sourceCode.title")}
              </p>
              <p className="mt-1 text-xs/relaxed text-muted-foreground">
                {t("openSource.sourceCode.description")}
              </p>
            </div>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-2 self-start",
              )}
            >
              <IconBrandGithub size={16} />
              {t("openSource.sourceCode.cta")}
            </a>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <IconCube size={18} />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">
                {t("openSource.printableSorter.title")}
              </p>
              <p className="mt-1 text-xs/relaxed text-muted-foreground">
                {t("openSource.printableSorter.description")}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={MODEL_URL}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <IconDownload size={16} />
                {t("openSource.printableSorter.getModel")}
              </a>
              <Link
                to="/build"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                {t("openSource.printableSorter.buildGuide")}
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <IconBrandDiscord size={18} />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">
                {t("openSource.community.title")}
              </p>
              <p className="mt-1 text-xs/relaxed text-muted-foreground">
                {t("openSource.community.description")}
              </p>
            </div>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-2 self-start",
              )}
            >
              <IconBrandDiscord size={16} />
              {t("openSource.community.cta")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
