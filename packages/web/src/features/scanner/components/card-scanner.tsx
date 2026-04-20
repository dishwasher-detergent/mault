import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCardScanner } from "@/features/scanner/api/use-card-scanner";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial, useSerialMessage } from "@/features/scanner/api/use-serial";
import { ScannerControls } from "@/features/scanner/components/scanner-controls";
import { ScannerMenu } from "@/features/scanner/components/scanner-menu";
import { ScannerOverlay } from "@/features/scanner/components/scanner-overlay";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import type { CardScannerProps } from "@magic-vault/shared";
import { IconArrowBarToDown, IconEye } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function CardScanner({ className }: CardScannerProps) {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { addCard, sendCatchAllBin, autoFeed, setAutoFeed } = useScannedCards();
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
    setZoom,
    allowDuplicates,
    setAllowDuplicates,
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

  const handleFeed = async () => {
    setIsFeeding(true);
    try {
      const sent = await sendCommand(JSON.stringify({ feeder: true }));
      if (!sent) {
        toast.error("Feed failed", {
          description: "Could not send feeder command.",
        });
        return;
      }
      const response = await receiveResponse(10000);
      if (!response) {
        toast.error("Feed timeout", {
          description: "Feeder did not respond in time.",
        });
        return;
      }
      try {
        const parsed = JSON.parse(response) as Record<string, unknown>;
        if (parsed.error) {
          toast.error("Feeder error", {
            description: String(parsed.error),
            duration: Infinity,
            dismissible: true,
          });
        }
      } catch {
        toast.error("Feed error", {
          description: "Unexpected response from feeder.",
        });
      }
    } finally {
      setIsFeeding(false);
    }
  };

  const canScan = isConnected && isReady && hasCatchAll && isCameraActive;
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
        <canvas ref={displayCanvasRef} className="absolute -rotate-90" />
        <canvas
          ref={overlayCanvasRef}
          className="absolute z-20 pointer-events-none -rotate-90"
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
          onCameraConnect={handleRetryError}
          onCameraDisconnect={handleStopCamera}
          onZoomChange={setZoom}
          onScannerConnect={connect}
          onScannerDisconnect={disconnect}
          onScannerRetry={sendTest}
          onCalibrate={() => navigate("/app/calibrate")}
          onAutoFeedChange={setAutoFeed}
          onAllowDuplicatesChange={setAllowDuplicates}
        />
      </div>
      {isConnected && isCameraActive && (
        <ButtonGroup className="w-full *:flex-1">
          <ScannerControls
            status={isReady && hasCatchAll ? status : "paused"}
            onForceAddDuplicate={handleForceAddDuplicate}
            onForceScan={handleForceScan}
            onPause={() => {
              setAutoFeed(false);
              handlePause();
            }}
            onResume={isReady && hasCatchAll ? handleResume : () => {}}
            disabled={!isReady || !hasCatchAll}
          />
          <Button
            onClick={handleFeed}
            variant="outline"
            disabled={!isReady || isFeeding}
          >
            <IconArrowBarToDown />
            {isFeeding ? "Feeding…" : "Feed"}
          </Button>
        </ButtonGroup>
      )}
    </div>
  );
}
