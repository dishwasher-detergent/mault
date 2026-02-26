import { Button } from "@/components/ui/button";
import {
  IconFocus2,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
} from "@tabler/icons-react";
import type { ScannerControlsProps } from "../types";

export function ScannerControls({
  status,
  onForceAddDuplicate,
  onForceScan,
  onPause,
  onResume,
  disabled,
}: ScannerControlsProps) {
  return (
    <>
      {status === "no-match" && (
        <Button onClick={onForceScan} variant="outline" disabled={disabled}>
          <IconFocus2 />
          Scan Again
        </Button>
      )}
      {status === "duplicate" && (
        <Button
          onClick={onForceAddDuplicate}
          variant="outline"
          disabled={disabled}
        >
          <IconPlus />
          Add Again
        </Button>
      )}
      {(status === "scanning" || status === "captured") && (
        <Button onClick={onForceScan} variant="outline" disabled={disabled}>
          <IconFocus2 />
          Scan Now
        </Button>
      )}
      {status === "paused" ? (
        <Button onClick={onResume} variant="outline" disabled={disabled}>
          <IconPlayerPlay />
          Resume
        </Button>
      ) : (
        <Button onClick={onPause} variant="outline" disabled={disabled}>
          <IconPlayerPause />
          Pause
        </Button>
      )}
    </>
  );
}
