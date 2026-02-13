"use client";

import { ScannerControls } from "@/components/scanner-controls";
import { ScannerOverlay } from "@/components/scanner-overlay";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useCardScanner } from "@/hooks/use-card-scanner";
import { useScannedCards } from "@/hooks/use-scanned-cards";
import { useSerial } from "@/hooks/use-serial";
import type { CardScannerProps } from "@/interfaces/scanner.interface";
import { cn } from "@/lib/utils";
import { IconDeviceUsb, IconDeviceUsbFilled } from "@tabler/icons-react";
import { useEffect, useRef } from "react";

export function CardScanner({ className }: CardScannerProps) {
  const { addCard } = useScannedCards();
  const { isConnected, connect, disconnect } = useSerial();
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

  // Auto-pause when Arduino is disconnected, resume when reconnected
  const wasConnectedRef = useRef(isConnected);
  useEffect(() => {
    if (!isConnected && wasConnectedRef.current) {
      handlePause();
    }
    if (isConnected && !wasConnectedRef.current && status === "paused") {
      handleResume();
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, handlePause, handleResume, status]);

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
          status={isConnected ? status : "paused"}
          onForceAddDuplicate={handleForceAddDuplicate}
          onForceScan={handleForceScan}
          onPause={handlePause}
          onResume={isConnected ? handleResume : () => {}}
          disabled={!isConnected}
        />
      </ButtonGroup>
    </div>
  );
}
