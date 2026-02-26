import { ScannerControls } from "./scanner-controls";
import { ScannerOverlay } from "./scanner-overlay";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCardScanner } from "../api/use-card-scanner";
import { useScannedCards } from "../api/use-scanned-cards";
import { useSerial, useSerialMessage } from "../api/use-serial";
import { cn } from "@/lib/utils";
import type { CardScannerProps } from "@magic-vault/shared";
import {
  IconCamera,
  IconCameraFilled,
  IconDeviceUsb,
  IconDeviceUsbFilled,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";

export function CardScanner({ className }: CardScannerProps) {
  const navigate = useNavigate();
  const { addCard, sendCatchAllBin } = useScannedCards();
  const { isConnected, isReady, connect, disconnect } = useSerial();
  const { hasCatchAll } = useBinConfigs();
  const {
    status,
    errorMessage,
    videoRef,
    displayCanvasRef,
    overlayCanvasRef,
    processingCanvasRef,
    handleForceAddDuplicate,
    handleForceScan,
    handlePause,
    handleResume,
    handleRetryError,
  } = useCardScanner({
    onSearchResults: (cards) => {
      for (const card of cards) {
        addCard(card);
      }
    },
    onNoMatch: sendCatchAllBin,
  });

  useSerialMessage((msg) => {
    if (
      typeof msg === "object" &&
      msg !== null &&
      "error" in msg &&
      (msg as Record<string, unknown>).error === "jam"
    ) {
      const { module, bin } = msg as Record<string, unknown>;
      handlePause();
      toast.error("Card jam detected", {
        description: `Card stuck at module ${module} (heading to bin ${bin}). Check the sorter and resume.`,
        duration: Infinity,
        dismissible: true,
      });
    }
  });

  const canScan = isConnected && isReady && hasCatchAll;
  const wasReadyRef = useRef(canScan);
  useEffect(() => {
    if (!canScan && wasReadyRef.current) {
      handlePause();
    }
    if (canScan && !wasReadyRef.current && status === "paused") {
      handleResume();
    }
    wasReadyRef.current = canScan;
  }, [canScan, handlePause, handleResume, status]);

  return (
    <div
      className={cn(
        "flex flex-col-reverse md:flex-col overflow-hidden gap-2",
        className,
      )}
    >
      <div className="relative overflow-hidden bg-background w-full h-full md:aspect-[2.5/3.5] max-w-full rounded-lg border">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={processingCanvasRef} className="hidden" />
        <canvas
          ref={displayCanvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
        />
        <ScannerOverlay
          status={status}
          errorMessage={errorMessage}
          isConnected={isConnected}
          isReady={isReady}
          hasCatchAll={hasCatchAll}
          onRetryError={handleRetryError}
        />
      </div>
      <ButtonGroup className="w-full *:flex-1">
        {status === "error" ? (
          <Button
            onClick={handleRetryError}
            variant="outline"
            style={{ flex: "1 1 0%" }}
          >
            <IconCamera className="mr-2" />
            Connect Camera
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  onClick={handleRetryError}
                  size="icon"
                  variant="outline"
                  style={{ flex: "none" }}
                />
              }
            >
              <IconCameraFilled />
            </TooltipTrigger>
            <TooltipContent>Reconnect Camera</TooltipContent>
          </Tooltip>
        )}
        {isConnected ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="icon"
                  variant="default"
                  style={{ flex: "none" }}
                />
              }
            >
              <IconDeviceUsbFilled />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate("/app/calibrate")}>
                Calibrate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={disconnect}>
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  onClick={connect}
                  size="icon"
                  variant="outline"
                  style={{ flex: "1 1 0%" }}
                >
                  <IconDeviceUsb className="mr-2" />
                  Connect Device
                </Button>
              }
            />
            <TooltipContent>Connect Device</TooltipContent>
          </Tooltip>
        )}
        {isConnected && (
          <ScannerControls
            status={isReady && hasCatchAll ? status : "paused"}
            onForceAddDuplicate={handleForceAddDuplicate}
            onForceScan={handleForceScan}
            onPause={handlePause}
            onResume={isReady && hasCatchAll ? handleResume : () => {}}
            disabled={!isReady || !hasCatchAll}
          />
        )}
      </ButtonGroup>
    </div>
  );
}
