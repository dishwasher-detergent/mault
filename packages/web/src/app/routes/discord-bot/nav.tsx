import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { neon } from "@/lib/auth/client";
import { DISCORD_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const navLinkClass =
  "relative py-1 transition-colors hover:text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100";

export function DiscordBotNav() {
  const { t } = useTranslation("discordBot");
  const { data, isPending } = neon.auth.useSession();
  const isSignedIn = !isPending && !!data?.user;

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <BrandMark />

        <nav className="hidden items-center gap-6 text-xs/relaxed font-medium text-muted-foreground md:flex">
          <a href="#setup" className={navLinkClass}>
            {t("nav.setup")}
          </a>
          <a href="#commands" className={navLinkClass}>
            {t("nav.commands")}
          </a>
          <a href="#features" className={navLinkClass}>
            {t("nav.features")}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t("nav.joinDiscordAria")}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconBrandDiscord size={18} />
          </a>
          <ThemeToggle />
          {isSignedIn ? (
            <Link
              to="/app"
              className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            >
              {t("nav.openApp")}
            </Link>
          ) : (
            <Link
              to="/auth/sign-up"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "shadow-sm shadow-primary/30 transition-shadow hover:shadow-md hover:shadow-primary/30",
              )}
            >
              {t("nav.getStarted")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
