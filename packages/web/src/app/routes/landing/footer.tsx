import { BrandMark } from "@/components/brand-mark";
import { DISCORD_URL } from "@/lib/links";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingFooter() {
  const { t } = useTranslation("landing");

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <BrandMark size="sm" />

        <nav className="flex items-center gap-5 text-xs text-muted-foreground">
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            {t("nav.features")}
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            {t("nav.howItWorks")}
          </a>
          <a
            href="#open-source"
            className="transition-colors hover:text-foreground"
          >
            {t("nav.openSource")}
          </a>
          <Link to="/build" className="transition-colors hover:text-foreground">
            {t("nav.build")}
          </Link>
          <Link
            to="/discord-bot"
            className="transition-colors hover:text-foreground"
          >
            {t("nav.discordBot")}
          </Link>
          <Link
            to="/auth/sign-in"
            className="transition-colors hover:text-foreground"
          >
            {t("nav.signIn")}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t("nav.discordAriaLabel")}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconBrandDiscord size={18} />
          </a>
          <p className="text-xs text-muted-foreground">
            {t("footer.copyright", {
              year: new Date().getFullYear(),
              version: __APP_VERSION__,
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
