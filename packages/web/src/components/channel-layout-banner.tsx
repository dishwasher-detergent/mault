import { Button } from "@/components/ui/button";
import { useChannelLayout } from "@/features/calibration/api/use-channel-layout";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function ChannelLayoutBanner() {
  const { t } = useTranslation("calibration");
  const channelLayout = useChannelLayout();
  const navigate = useNavigate();

  if (channelLayout !== "legacy") return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-400/20 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
      <IconAlertTriangle className="size-3.5 shrink-0" />
      <span>{t("channelLayoutToggle.legacyBanner")}</span>
      <Button
        variant="outline"
        size="xs"
        onClick={() => navigate("/app/calibrate")}
        className="border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10"
      >
        {t("channelLayoutToggle.legacyBannerAction")}
      </Button>
    </div>
  );
}
