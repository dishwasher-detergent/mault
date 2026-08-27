import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { neon } from "@/lib/auth/client";
import { DISCORD_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const navLinkClass = "transition-colors hover:text-foreground";

export function LandingNav() {
  const { t } = useTranslation("landing");
  const { data, isPending } = neon.auth.useSession();
  const isSignedIn = !isPending && !!data?.user;

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <BrandMark />

        <nav className="hidden items-center gap-6 text-xs/relaxed font-medium text-muted-foreground md:flex">
          <a href="#features" className={navLinkClass}>
            {t("nav.features")}
          </a>
          <a href="#how-it-works" className={navLinkClass}>
            {t("nav.howItWorks")}
          </a>
          <a href="#open-source" className={navLinkClass}>
            {t("nav.openSource")}
          </a>
          <Link to="/build" className={navLinkClass}>
            {t("nav.build")}
          </Link>
          <Link to="/discord-bot" className={navLinkClass}>
            {t("nav.discordBot")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t("nav.discordAriaLabel")}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconBrandDiscord size={18} />
          </a>
          <ThemeToggle />
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {isSignedIn ? (
            <Link
              to="/app"
              className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            >
              {t("nav.openApp")}
            </Link>
          ) : (
            <>
              <Link
                to="/auth/sign-in"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "hidden sm:inline-flex",
                )}
              >
                {t("nav.signIn")}
              </Link>
              <Link
                to="/auth/sign-up"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "shadow-sm shadow-primary/30 transition-shadow hover:shadow-md hover:shadow-primary/30",
                )}
              >
                {t("nav.getStarted")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
