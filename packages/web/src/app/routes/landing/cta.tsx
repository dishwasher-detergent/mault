import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingCta() {
  const { t } = useTranslation("landing");

  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-primary/10 px-6 py-14 text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {t("cta.heading")}
          </h2>
          <p className="max-w-md text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            {t("cta.subtitle")}
          </p>
          <Link
            to="/auth/sign-up"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "mt-2",
            )}
          >
            {t("cta.button")}
            <IconArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
