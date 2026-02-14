import { Button } from "@/components/ui/button";
import type { ScannerStatus } from "@/interfaces/scanner.interface";
import {
  IconCamera,
  IconDeviceUsb,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";

interface ScannerOverlayProps {
  status: ScannerStatus;
  errorMessage: string;
  isConnected: boolean;
  onRetryError: () => void;
}

export function ScannerOverlay({
  status,
  errorMessage,
  isConnected,
  onRetryError,
}: ScannerOverlayProps) {
  if (!isConnected) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4">
        <div className="text-center text-sm text-muted-foreground">
          <IconDeviceUsb className="mx-auto mb-2 size-8" />
          <p>Connect Mault device to start scanning.</p>
        </div>
      </div>
    );
  }

  switch (status) {
    case "initializing":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-sm py-2 px-3 flex flex-row gap-1 items-center">
          <IconLoader2 className="size-4 animate-spin" />
          <span>Initializing Scanner...</span>
        </div>
      );
    case "requesting-camera":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-sm py-2 px-3 flex flex-row gap-1 items-center">
          <IconCamera className="size-4" />
          <span>Requesting camera access...</span>
        </div>
      );
    case "error":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-sm py-2 px-3 flex flex-row gap-1 items-start justify-between">
          <span className="text-sm text-red-400">{errorMessage}</span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onRetryError}
            className="text-white border-white/30"
          >
            <IconRefresh />
          </Button>
        </div>
      );
    case "searching":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-sm py-2 px-3 flex flex-row gap-1 items-center justify-between">
          <span>Identifying card...</span>
          <IconLoader2 className="size-4 animate-spin" />
        </div>
      );
    case "paused":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-sm py-2 px-3 flex flex-row gap-1 items-center">
          <span>Scanner Paused</span>
        </div>
      );
    case "duplicate":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-sm py-2 px-3 flex flex-row gap-1 items-center">
          <span>Duplicate card detected</span>
        </div>
      );
    case "no-match":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-sm py-2 px-3 flex flex-row gap-1 items-center">
          <span>Card not found</span>
        </div>
      );
    default:
      return null;
  }
}
