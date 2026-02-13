import { CardSelectDialog } from "@/components/card-select-dialog";
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
  onPause: () => void;
  onResume: () => void;
}

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
        <Button onClick={onForceScan} variant="outline">
          <IconFocus2 className="size-3.5" />
          Scan Again
        </Button>
      )}
      {status === "duplicate" && (
        <Button onClick={onForceAddDuplicate} variant="outline">
          <IconPlus className="size-3.5" />
          Add Again
        </Button>
      )}
      {(status === "scanning" || status === "captured") && (
        <Button onClick={onForceScan} variant="outline">
          <IconFocus2 className="size-3.5" />
          Scan Now
        </Button>
      )}
      {status === "paused" ? (
        <Button onClick={onResume} variant="outline">
          <IconPlayerPlay className="size-3.5" />
          Resume
        </Button>
      ) : (
        <Button onClick={onPause} variant="outline">
          <IconPlayerPause className="size-3.5" />
          Pause
        </Button>
      )}
      <CardSelectDialog
        trigger={
          <Button variant="outline">
            <IconSearch className="size-3.5" />
            Add Manually
          </Button>
        }
      ></CardSelectDialog>
    </>
  );
}
