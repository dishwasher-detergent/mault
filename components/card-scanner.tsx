"use client";

import { ScannerControls } from "@/components/scanner-controls";
import { ScannerOverlay } from "@/components/scanner-overlay";
import { useCardScanner } from "@/hooks/use-card-scanner";
import { useScannedCards } from "@/hooks/use-scanned-cards";
import type { CardScannerProps } from "@/interfaces/scanner.interface";
import { cn } from "@/lib/utils";
import { ButtonGroup } from "./ui/button-group";

export function CardScanner({ className }: CardScannerProps) {
  const { addCard } = useScannedCards();
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
          onRetryError={handleRetryError}
        />
      </div>
      <ButtonGroup className="mt-2 w-full *:flex-1">
        <ScannerControls
          status={status}
          onForceAddDuplicate={handleForceAddDuplicate}
          onForceScan={handleForceScan}
          onPause={handlePause}
          onResume={handleResume}
        />
      </ButtonGroup>
    </div>
  );
}
