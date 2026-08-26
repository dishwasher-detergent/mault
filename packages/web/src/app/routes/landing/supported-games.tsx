import { useTranslation } from "react-i18next";
import { usePublicGames } from "@/app/routes/landing/use-public-games";

export function LandingSupportedGames() {
  const { t } = useTranslation("landing");
  const games = usePublicGames();

  if (games !== null && games.length === 0) return null;

  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {t("supportedGames.heading")}
          </h2>
          <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            {t("supportedGames.subtitle")}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {games === null
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-32 animate-pulse rounded-full border bg-card"
                />
              ))
            : games.map((game) => (
                <span
                  key={game.key}
                  className="rounded-full border bg-card px-4 py-2 text-sm font-medium"
                >
                  {game.name}
                </span>
              ))}
        </div>
      </div>
    </section>
  );
}
