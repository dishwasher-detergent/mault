import { Button } from "@/components/ui/button";
import type { ScannerStatus } from "@/interfaces/scanner.interface";
import {
  IconFocus2,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";

interface ScannerControlsProps {
  status: ScannerStatus;
  duplicateCardName?: string;
  onForceAddDuplicate: () => void;
  onForceScan: () => void;
  onManualAdd: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function ScannerControls({
  status,
  onForceAddDuplicate,
  onForceScan,
  onManualAdd,
  onPause,
  onResume,
}: ScannerControlsProps) {
  return (
    <>
      {status === "no-match" && (
        <Button size="lg" onClick={onForceScan} variant="secondary">
          <IconFocus2 className="size-3.5" />
          Scan Again
        </Button>
      )}
      {status === "duplicate" && (
        <Button size="lg" onClick={onForceAddDuplicate} variant="secondary">
          <IconPlus className="size-3.5" />
          Add Again
        </Button>
      )}
      {(status === "scanning" || status === "captured") && (
        <Button size="lg" onClick={onForceScan} variant="secondary">
          <IconFocus2 className="size-3.5" />
          Scan Now
        </Button>
      )}
      {status === "paused" ? (
        <Button size="lg" onClick={onResume} variant="secondary">
          <IconPlayerPlay className="size-3.5" />
          Resume
        </Button>
      ) : (
        <Button size="lg" onClick={onPause} variant="secondary">
          <IconPlayerPause className="size-3.5" />
          Pause
        </Button>
      )}
      <Button size="lg" onClick={onManualAdd} variant="secondary">
        <IconSearch className="size-3.5" />
        Add Manually
      </Button>
    </>
  );
}
