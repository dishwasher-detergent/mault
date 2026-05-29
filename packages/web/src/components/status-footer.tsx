import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { cn } from "@/lib/utils";

function Dot({ className }: { className?: string }) {
  return (
    <span className={cn("inline-block size-1.5 rounded-full", className)} />
  );
}

const CAMERA_DOT: Record<string, string> = {
  idle: "bg-muted-foreground/40",
  requesting: "bg-yellow-500",
  ready: "bg-green-500",
  error: "bg-red-500",
};

export function StatusFooter() {
  const { status: cameraStatus } = useCameraContext();
  const { isConnected, isReady } = useSerial();
  const { cards } = useScannedCards();

  const totalValue = cards.reduce(
    (sum, { card }) => sum + parseFloat(card.prices.usd ?? "0"),
    0,
  );

  const deviceDot = !isConnected
    ? "bg-muted-foreground/40"
    : !isReady
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <span className="flex items-center gap-1">
        <Dot className={CAMERA_DOT[cameraStatus] ?? "bg-muted-foreground/40"} />
        Camera
      </span>
      <span className="flex items-center gap-1">
        <Dot className={deviceDot} />
        Device
      </span>
      {cards.length > 0 && (
        <span>
          {cards.length} card{cards.length !== 1 ? "s" : ""} · $
          {totalValue.toFixed(2)}
        </span>
      )}
    </div>
  );
}
