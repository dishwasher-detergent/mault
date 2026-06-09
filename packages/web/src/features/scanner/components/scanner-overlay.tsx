import { Button } from "@/components/ui/button";
import type { ScannerOverlayProps } from "@/features/scanner/types";
import {
  IconAlertTriangle,
  IconCamera,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";

function StatusPill({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "warning" | "error" | "loading";
}) {
  const base =
    "absolute bottom-1 left-1 right-1 rounded-lg backdrop-blur-3xl border text-xs px-2 py-1 flex flex-row gap-1.5 items-center";
  const variants = {
    default: "bg-background/50 border-border/60",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    error: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
    loading: "bg-background/50 border-border/60",
  };
  return <div className={`${base} ${variants[variant]}`}>{children}</div>;
}

export function ScannerOverlay({
  status,
  errorMessage,
  isCameraActive,
  isConnected,
  isReady,
  hasCatchAll,
  onRetryError,
}: ScannerOverlayProps) {
  if (!isCameraActive) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4">
        <div className="text-center text-xs text-muted-foreground">
          <IconCamera className="mx-auto mb-2 size-5" />
          <p>Connect a camera to start scanning.</p>
        </div>
      </div>
    );
  }

  if (isConnected && isReady && !hasCatchAll) {
    return (
      <StatusPill variant="warning">
        <IconAlertTriangle className="size-3.5 shrink-0" />
        <span>No catch-all bin configured — unmatched cards won't be sorted.</span>
      </StatusPill>
    );
  }

  switch (status) {
    case "initializing":
      return (
        <StatusPill variant="loading">
          <IconLoader2 className="size-3.5 animate-spin shrink-0" />
          <span>Initializing scanner…</span>
        </StatusPill>
      );
    case "requesting-camera":
      return (
        <StatusPill variant="loading">
          <IconCamera className="size-3.5 shrink-0" />
          <span>Requesting camera access…</span>
        </StatusPill>
      );
    case "error":
      return (
        <StatusPill variant="error">
          <span className="flex-1">{errorMessage}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={onRetryError}
            className="size-6 shrink-0"
          >
            <IconRefresh className="size-3" />
          </Button>
        </StatusPill>
      );
    case "searching":
      return (
        <StatusPill variant="loading">
          <IconLoader2 className="size-3.5 animate-spin shrink-0" />
          <span>Identifying card…</span>
        </StatusPill>
      );
    case "paused":
      return (
        <StatusPill>
          <span className="text-muted-foreground">Scanner paused — press Resume to continue.</span>
        </StatusPill>
      );
    case "duplicate":
      return (
        <StatusPill variant="warning">
          <IconAlertTriangle className="size-3.5 shrink-0" />
          <span>Same card scanned — use Add Again to add it anyway.</span>
        </StatusPill>
      );
    case "no-match":
      return (
        <StatusPill variant="warning">
          <IconAlertTriangle className="size-3.5 shrink-0" />
          <span>Card not recognized — try Scan Again or adjust lighting.</span>
        </StatusPill>
      );
    default:
      return null;
  }
}
