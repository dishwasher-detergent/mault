import { IconPigFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function DiscordBotFooter() {
  const { t } = useTranslation("discordBot");

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <IconPigFilled className="size-3.5" />
          </span>
          <span className="font-heading text-xs font-semibold">Mault</span>
        </Link>

        <nav className="flex items-center gap-5 text-xs text-muted-foreground">
          <a
            href="https://github.com/dishwasher-detergent/mault/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            {t("footer.reportIssue")}
          </a>
          <Link
            to="/auth/sign-in"
            className="transition-colors hover:text-foreground"
          >
            {t("footer.signIn")}
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
