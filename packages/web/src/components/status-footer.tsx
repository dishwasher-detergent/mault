import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { IconPointFilled } from "@tabler/icons-react";

type BadgeVariant = "success" | "outline" | "destructive";

const CAMERA_VARIANT: Record<string, BadgeVariant> = {
  ready: "success",
  requesting: "outline",
  idle: "outline",
  error: "destructive",
};

export function StatusFooter() {
  const { status: cameraStatus } = useCameraContext();
  const { isConnected, isReady } = useSerial();
  const { cards } = useScannedCards();

  const totalValue = cards.reduce(
    (sum, { card }) => sum + parseFloat(card.prices.usd ?? "0"),
    0,
  );

  const deviceVariant: BadgeVariant = !isConnected
    ? "outline"
    : !isReady
      ? "outline"
      : "success";

  const cameraVariant: BadgeVariant = CAMERA_VARIANT[cameraStatus] ?? "outline";

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <p
        className={`text-xs ${cameraVariant === "success" ? "text-green-600" : cameraVariant === "destructive" ? "text-red-600" : "text-muted-foreground"}`}
      >
        Camera
      </p>
      <p
        className={`text-xs ${deviceVariant === "success" ? "text-green-600" : "text-muted-foreground"}`}
      >
        Device
      </p>
      {cards.length > 0 && (
        <div className="text-xs flex flex-row items-center gap-2">
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
