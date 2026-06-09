import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconPointFilled } from "@tabler/icons-react";

function StatusDot({ variant }: { variant: "success" | "warning" | "error" | "muted" }) {
  const colors = {
    success: "bg-green-500",
    warning: "bg-amber-500 animate-pulse",
    error: "bg-red-500",
    muted: "bg-muted-foreground/30",
  };
  return <span className={`size-1.5 rounded-full shrink-0 ${colors[variant]}`} />;
}

function StatusItem({
  label,
  dot,
  tooltip,
}: {
  label: string;
  dot: "success" | "warning" | "error" | "muted";
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="flex items-center gap-1.5 cursor-default">
        <StatusDot variant={dot} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function StatusFooter() {
  const { status: cameraStatus } = useCameraContext();
  const { isConnected, isReady } = useSerial();
  const { cards } = useScannedCards();

  const totalValue = cards.reduce(
    (sum, { card }) => sum + parseFloat(card.prices.usd ?? "0"),
    0,
  );

  const cameraDot =
    cameraStatus === "ready"
      ? "success"
      : cameraStatus === "error"
        ? "error"
        : cameraStatus === "requesting"
          ? "warning"
          : "muted";

  const cameraTooltip =
    cameraStatus === "ready"
      ? "Camera connected"
      : cameraStatus === "error"
        ? "Camera error"
        : cameraStatus === "requesting"
          ? "Requesting camera access…"
          : "No camera";

  const deviceDot = !isConnected ? "muted" : !isReady ? "warning" : "success";
  const deviceTooltip = !isConnected
    ? "No sorter connected"
    : !isReady
      ? "Sorter connected, running self-test…"
      : "Sorter ready";

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <StatusItem label="Camera" dot={cameraDot} tooltip={cameraTooltip} />
      <StatusItem label="Sorter" dot={deviceDot} tooltip={deviceTooltip} />
      {cards.length > 0 && (
        <div className="text-xs flex flex-row items-center gap-2">
          <IconPointFilled className="size-2" />
          <p>
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </p>
          <IconPointFilled className="size-2" />
          <p>${totalValue.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
