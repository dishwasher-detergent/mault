import { Button } from "@/components/ui/button";
import type { ScannerStatus } from "@/interfaces/scanner.interface";
import { IconCamera, IconLoader2, IconRefresh } from "@tabler/icons-react";

interface ScannerOverlayProps {
  status: ScannerStatus;
  errorMessage: string;
  onRetryError: () => void;
}

export function ScannerOverlay({
  status,
  errorMessage,
  onRetryError,
}: ScannerOverlayProps) {
  switch (status) {
    case "initializing":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-xs py-1 px-2 font-medium flex flex-row gap-1 items-center">
          <IconLoader2 className="size-4 animate-spin" />
          <span>Initializing Scanner...</span>
        </div>
      );
    case "requesting-camera":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-xs py-1 px-2 font-medium flex flex-row gap-1 items-center">
          <IconCamera className="size-4" />
          <span>Requesting camera access...</span>
        </div>
      );
    case "error":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-xs py-1 px-2 font-medium flex flex-row gap-1 items-center justify-between">
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
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-xs py-1 px-2 font-medium flex flex-row gap-1 items-center justify-between">
          <span>Identifying card...</span>
          <IconLoader2 className="size-4 animate-spin" />
        </div>
      );
    case "paused":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-xs py-1 px-2 font-medium flex flex-row gap-1 items-center">
          <span>Scanner Paused</span>
        </div>
      );
    case "duplicate":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-xs py-1 px-2 font-medium flex flex-row gap-1 items-center">
          <span>Duplicate card detected</span>
        </div>
      );
    case "no-match":
      return (
        <div className="absolute bottom-1 left-1 right-1 rounded-md bg-background/50 backdrop-blur-3xl border text-xs py-1 px-2 font-medium flex flex-row gap-1 items-center">
          <span>Card not found</span>
        </div>
      );
    default:
      return null;
  }
}
