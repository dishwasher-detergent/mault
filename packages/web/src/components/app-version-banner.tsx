import { Button } from "@/components/ui/button";
import { useAppVersionCheck } from "@/hooks/use-app-version-check";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function AppVersionBanner() {
  const { t } = useTranslation("common");
  const isOutdated = useAppVersionCheck();

  if (!isOutdated) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-400/20 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
      <IconAlertTriangle className="size-3.5 shrink-0" />
      <span>{t("appVersion.outdatedBanner")}</span>
      <Button
        size="xs"
        variant="outline"
        className="shrink-0 border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-500/20 dark:text-amber-200"
        onClick={() => window.location.reload()}
      >
        {t("appVersion.refreshButton")}
      </Button>
    </div>
  );
}
