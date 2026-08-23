import { Button } from "@/components/ui/button";
import { useSerial } from "@/features/scanner/api/use-serial";
import { Esp32FlashDialog } from "@/features/scanner/components/esp32-flash-dialog";
import { LATEST_FIRMWARE_VERSION } from "@/lib/firmware-version";
import { FIRMWARE_RELEASES_URL } from "@/lib/links";
import { isFirmwareVersionOutdated } from "@magic-vault/shared";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function FirmwareVersionBanner() {
  const { t } = useTranslation("scanner");
  const { isConnected, firmwareVersion, board } = useSerial();
  const [flashDialogOpen, setFlashDialogOpen] = useState(false);

  if (
    !isConnected ||
    !isFirmwareVersionOutdated(firmwareVersion, LATEST_FIRMWARE_VERSION)
  )
    return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-400/20 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
      <IconAlertTriangle className="size-3.5 shrink-0" />
      <span>
        {t("serial.firmwareOutdatedBanner", {
          version: firmwareVersion,
          latest: LATEST_FIRMWARE_VERSION,
        })}
      </span>
      {board === "esp32" ? (
        <>
          <Button
            size="xs"
            variant="outline"
            className="shrink-0 border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-500/20 dark:text-amber-200"
            onClick={() => setFlashDialogOpen(true)}
          >
            {t("serial.update.browserButton")}
          </Button>
          <Esp32FlashDialog
            open={flashDialogOpen}
            onOpenChange={setFlashDialogOpen}
          />
        </>
      ) : (
        <Button
          size="xs"
          variant="outline"
          className="shrink-0 border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-500/20 dark:text-amber-200"
          render={
            <a href={FIRMWARE_RELEASES_URL} target="_blank" rel="noreferrer" />
          }
        >
          {t("serial.update.manualButton")}
        </Button>
      )}
    </div>
  );
}
