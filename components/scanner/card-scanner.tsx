"use client";

import { ScannerControls } from "@/components/scanner/scanner-controls";
import { ScannerOverlay } from "@/components/scanner/scanner-overlay";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useCardScanner } from "@/hooks/use-card-scanner";
import { useBinConfigs } from "@/hooks/use-bin-configs";
import { useScannedCards } from "@/hooks/use-scanned-cards";
import { useSerial } from "@/hooks/use-serial";
import type { CardScannerProps } from "@/interfaces/scanner.interface";
import { cn } from "@/lib/utils";
import { IconDeviceUsb, IconDeviceUsbFilled } from "@tabler/icons-react";
import { useEffect, useRef } from "react";

export function CardScanner({ className }: CardScannerProps) {
  const { addCard } = useScannedCards();
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
  });

  const canScan = isReady && hasCatchAll;
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
    <div className={cn("flex flex-col overflow-hidden", className)}>
      <div className="relative overflow-hidden bg-background aspect-[2.5/3.5] max-w-full rounded-lg border">
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
      <ButtonGroup className="mt-2 w-full *:flex-1">
        <Button
          onClick={isConnected ? disconnect : connect}
          size="icon-sm"
          className="flex-none!"
          variant={isConnected ? "default" : "outline"}
        >
          {isConnected ? <IconDeviceUsbFilled /> : <IconDeviceUsb />}
        </Button>
        <ScannerControls
          status={isReady && hasCatchAll ? status : "paused"}
          onForceAddDuplicate={handleForceAddDuplicate}
          onForceScan={handleForceScan}
          onPause={handlePause}
          onResume={isReady && hasCatchAll ? handleResume : () => {}}
          disabled={!isReady || !hasCatchAll}
        />
      </ButtonGroup>
    </div>
  );
}
