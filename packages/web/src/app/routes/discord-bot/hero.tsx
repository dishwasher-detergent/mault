import { buttonVariants } from "@/components/ui/button";
import { neon } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function DiscordBotHero() {
  const { t } = useTranslation("discordBot");
  const { data, isPending } = neon.auth.useSession();
  const isSignedIn = !isPending && !!data?.user;

  return (
    <section className="mx-auto max-w-4xl px-4 pt-12 pb-16">
      <div className="flex items-center gap-2 text-primary">
        <IconBrandDiscord className="size-5" />
        <span className="text-xs font-semibold tracking-wide uppercase">
          {t("hero.eyebrow")}
        </span>
      </div>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        {t("hero.title")}
      </h1>
      <p className="mt-4 max-w-2xl text-sm/relaxed text-muted-foreground md:text-base/relaxed">
        {t("hero.description")}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to={isSignedIn ? "/app/settings" : "/auth/sign-up"}
          className={cn(buttonVariants({ variant: "default", size: "lg" }))}
        >
          {isSignedIn ? t("hero.openSettings") : t("hero.getStarted")}
        </Link>
        <a
          href="#setup"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          {t("hero.seeSetup")}
        </a>
      </div>

      <p className="mt-5 max-w-2xl text-xs/relaxed text-muted-foreground">
        {t("hero.selfHostedNote")}
      </p>
    </section>
  );
}
