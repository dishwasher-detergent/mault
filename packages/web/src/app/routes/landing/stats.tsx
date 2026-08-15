import { useTranslation } from "react-i18next";
import { usePublicGames } from "@/app/routes/landing/use-public-games";

export function LandingStats() {
  const { t } = useTranslation("landing");
  const games = usePublicGames();

  const stats = [
    { key: "bins", value: "7" },
    { key: "games", value: games === null ? "–" : String(games.length) },
    { key: "collections", value: "∞" },
    { key: "cardsPerHour", value: "≤800" },
  ] as const;

  return (
    <section className="border-y bg-secondary/30">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.key} className="flex flex-col items-center text-center">
            <span className="font-heading text-2xl font-semibold text-primary md:text-3xl">
              {stat.value}
            </span>
            <span className="mt-1 text-xs/relaxed text-muted-foreground">
              {t(`stats.items.${stat.key}`)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
