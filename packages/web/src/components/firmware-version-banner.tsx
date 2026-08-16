import { useSerial } from "@/features/scanner/api/use-serial";
import { LATEST_ARDUINO_VERSION } from "@/lib/arduino-version";
import { isArduinoVersionOutdated } from "@magic-vault/shared";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function FirmwareVersionBanner() {
  const { t } = useTranslation("scanner");
  const { isConnected, firmwareVersion } = useSerial();

  if (
    !isConnected ||
    !isArduinoVersionOutdated(firmwareVersion, LATEST_ARDUINO_VERSION)
  )
    return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-400/20 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
      <IconAlertTriangle className="size-3.5 shrink-0" />
      <span>
        {t("serial.firmwareOutdatedBanner", {
          version: firmwareVersion,
          latest: LATEST_ARDUINO_VERSION,
        })}
      </span>
    </div>
  );
}
