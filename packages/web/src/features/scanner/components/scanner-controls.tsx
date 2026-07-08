import { Button } from "@/components/ui/button";
import type { ScannerControlsProps } from "@/features/scanner/types";
import {
  IconFocus2,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
} from "@tabler/icons-react";

export function ScannerControls({
  status,
  onForceAddDuplicate,
  onForceScan,
  onPause,
  onResume,
}: ScannerControlsProps) {
  return (
    <>
      {status === "no-match" && (
        <Button onClick={onForceScan} variant="secondary">
          <IconFocus2 />
          Scan Again
        </Button>
      )}
      {status === "duplicate" && (
        <Button onClick={onForceAddDuplicate} variant="secondary">
          <IconPlus />
          Add Again
        </Button>
      )}
      {(status === "scanning" || status === "captured") && (
        <Button onClick={onForceScan} variant="secondary">
          <IconFocus2 />
          Scan Now
        </Button>
      )}
      {status === "paused" ? (
        <Button onClick={onResume} variant="secondary">
          <IconPlayerPlay />
          Resume
        </Button>
      ) : (
        <Button onClick={onPause} variant="secondary">
          <IconPlayerPause />
          Pause
        </Button>
      )}
    </>
  );
}
