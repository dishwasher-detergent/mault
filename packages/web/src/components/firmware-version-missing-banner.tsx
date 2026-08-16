import { useSerial } from "@/features/scanner/api/use-serial";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function FirmwareVersionMissingBanner() {
  const { t } = useTranslation("scanner");
  const { isConnected, isReady, firmwareVersion } = useSerial();

  if (!isConnected || !isReady || firmwareVersion) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-red-500/30 bg-red-500/20 px-4 py-1.5 text-xs text-red-900 dark:bg-red-500/10 dark:text-red-300">
      <IconAlertTriangle className="size-3.5 shrink-0" />
      <span>{t("serial.firmwareVersionMissingBanner")}</span>
    </div>
  );
}
