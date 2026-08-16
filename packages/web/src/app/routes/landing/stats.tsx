import { useTranslation } from "react-i18next";
import { useLandingStats } from "@/app/routes/landing/use-landing-stats";

export function LandingStats() {
  const { t } = useTranslation("landing");
  const stats = useLandingStats();

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
