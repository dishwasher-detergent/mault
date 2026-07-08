import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import { useCardScanner } from "@/features/scanner/api/use-card-scanner";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useRegisterScannerIsland } from "@/features/scanner/api/use-scanner-island";
import { useSerial, useSerialMessage } from "@/features/scanner/api/use-serial";
import { ScannerMenu } from "@/features/scanner/components/scanner-menu";
import { ScannerOverlay } from "@/features/scanner/components/scanner-overlay";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import type { CardScannerProps } from "@magic-vault/shared";
import { IconEye } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function CardScanner({ className, compact }: CardScannerProps) {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const isMobile = useIsMobile();
  const { addCard, sendCatchAllBin, autoFeed, setAutoFeed } = useScannedCards();
  const registerIsland = useRegisterScannerIsland();
  const {
    isConnected,
    isReady,
    connect,
    disconnect,
    sendTest,
    sendCommand,
    receiveResponse,
  } = useSerial();
  const [isFeeding, setIsFeeding] = useState(false);
  const { hasCatchAll } = useBinConfigs();
  const {
    status,
    errorMessage,
    isCameraActive,
    debugImageUrl,
    videoRef,
    displayCanvasRef,
    overlayCanvasRef,
    processingCanvasRef,
    handleForceAddDuplicate,
    handleForceScan,
    handlePause,
    handleResume,
    handleRetryError,
    handleStopCamera,
    zoom,
    zoomRange,
    cameras,
    selectedCameraId,
    setZoom,
    selectCamera,
    allowDuplicates,
    setAllowDuplicates,
  } = useCardScanner({
    onSearchResults: (cards, capturedImageUrl) => {
      if (cards.length > 0) {
        addCard(cards[0], capturedImageUrl, cards.slice(1));
      }
    },
    onNoMatch: sendCatchAllBin,
    rotated: !isMobile,
  });

  useSerialMessage((msg) => {
    if (
      typeof msg === "object" &&
      msg !== null &&
      "error" in msg &&
      (msg as Record<string, unknown>).error === "jam"
    ) {
      const raw = msg as Record<string, unknown>;
      handlePause();
      toast.error("Card jam detected", {
        description: `Card stuck at module ${raw.module} (heading to bin ${raw.bin}). Check the sorter and resume.`,
        duration: Infinity,
        dismissible: true,
      });
      void reportSerialEvent({ command: "jam", sent: true, response: raw });
    }
  });

  const handleFeed = useCallback(async () => {
    setIsFeeding(true);
    try {
      const sent = await sendCommand(JSON.stringify({ feeder: true }));
      if (!sent) {
        toast.error("Feed failed", {
          description: "Could not send feeder command.",
        });
        void reportSerialEvent({ command: "feeder", sent: false, response: null });
        return;
      }
      const response = await receiveResponse(10000);
      if (!response) {
        toast.error("Feed timeout", {
          description: "Feeder did not respond in time.",
        });
        void reportSerialEvent({ command: "feeder", sent: true, response: null });
        return;
      }
      try {
        const parsed = JSON.parse(response) as Record<string, unknown>;
        if (parsed.empty) {
          toast.error("Feeder empty", {
            description: "No cards remaining in the hopper. Add more cards to continue.",
            duration: Infinity,
            dismissible: true,
          });
          void reportSerialEvent({ command: "feeder", sent: true, response: parsed });
        } else if (parsed.error) {
          toast.error("Feeder error", {
            description: String(parsed.error),
            duration: Infinity,
            dismissible: true,
          });
          void reportSerialEvent({ command: "feeder", sent: true, response: parsed });
        }
      } catch {
        toast.error("Feed error", {
          description: "Unexpected response from feeder.",
        });
        void reportSerialEvent({ command: "feeder", sent: true, response });
      }
    } finally {
      setIsFeeding(false);
    }
  }, [sendCommand, receiveResponse]);

  useEffect(() => {
    registerIsland({
      status,
      isCameraActive,
      isConnected,
      isReady,
      isFeeding,
      handleForceAddDuplicate,
      handleForceScan,
      handlePause: () => { setAutoFeed(false); handlePause(); },
      handleResume,
      handleFeed,
    });
  }, [status, isCameraActive, isConnected, isReady, isFeeding,
      handleForceAddDuplicate, handleForceScan, handlePause, handleResume,
      handleFeed, setAutoFeed, registerIsland]);

  useEffect(() => () => registerIsland(null), [registerIsland]);

  const canScan = isCameraActive;
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
      <div className={cn("relative overflow-hidden bg-background w-full h-full max-w-full rounded-lg border", !compact && "md:aspect-[2.5/3.5]")}>
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={processingCanvasRef} className="hidden" />
        <canvas ref={displayCanvasRef} className={cn("absolute", !isMobile && "rotate-90")} />
        <canvas
          ref={overlayCanvasRef}
          className={cn("absolute z-20 pointer-events-none", !isMobile && "rotate-90")}
        />
        {isAdmin && debugImageUrl && (
          <Tooltip>
            <TooltipTrigger className="absolute top-2 left-2 z-30 flex items-center justify-center size-7 rounded-lg bg-background/70 text-foreground backdrop-blur-sm hover:bg-background/90 transition-colors">
              <IconEye size={16} />
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="bg-background text-foreground border border-border p-0 shadow-lg max-w-none"
            >
              <img
                src={debugImageUrl}
                alt="Last search image"
                className="w-48"
              />
            </TooltipContent>
          </Tooltip>
        )}
        <ScannerOverlay
          status={status}
          errorMessage={errorMessage}
          isCameraActive={isCameraActive}
          isConnected={isConnected}
          isReady={isReady}
          hasCatchAll={hasCatchAll}
          onRetryError={handleRetryError}
        />
        <ScannerMenu
          isCameraActive={isCameraActive}
          isConnected={isConnected}
          autoFeed={autoFeed}
          allowDuplicates={allowDuplicates}
          zoom={zoom}
          zoomRange={zoomRange}
          cameras={cameras}
          selectedCameraId={selectedCameraId}
          onCameraConnect={handleRetryError}
          onCameraDisconnect={handleStopCamera}
          onCameraSelect={selectCamera}
          onZoomChange={setZoom}
          onScannerConnect={connect}
          onScannerDisconnect={disconnect}
          onScannerRetry={sendTest}
          onCalibrate={() => navigate("/app/calibrate")}
          onAutoFeedChange={setAutoFeed}
          onAllowDuplicatesChange={setAllowDuplicates}
        />
      </div>
    </div>
  );
}
