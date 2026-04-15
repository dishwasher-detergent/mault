import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconPackage, IconPlayerPlay } from "@tabler/icons-react";

const BINS = [1, 2, 3, 4, 5, 6, 7] as const;

interface BinRoutingControlsProps {
  activeBin: number | null;
  isConnected: boolean;
  isSampleRunning: boolean;
  onTestBin: (bin: number) => void;
  onFeed: () => void;
  onSampleRun: () => void;
}

export function BinRoutingControls({
  activeBin,
  isConnected,
  isSampleRunning,
  onTestBin,
  onFeed,
  onSampleRun,
}: BinRoutingControlsProps) {
  const busy = activeBin !== null || isSampleRunning;

  return (
    <div className="flex flex-col gap-2">
      <Label>Bin Routing</Label>
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={!isConnected || busy} onClick={onFeed}>
          Feed
        </Button>
        <Button
          variant={isSampleRunning ? "default" : "outline"}
          disabled={!isConnected || busy}
          onClick={onSampleRun}
        >
          <IconPlayerPlay />
          {isSampleRunning
            ? activeBin !== null
              ? `Bin ${activeBin}…`
              : "Running…"
            : "Sample Run"}
        </Button>
        <div className="bg-border w-px self-stretch" />
        {BINS.map((bin) => (
          <Button
            key={bin}
            variant={activeBin === bin && !isSampleRunning ? "default" : "outline"}
            disabled={!isConnected || busy}
            onClick={() => onTestBin(bin)}
          >
            <IconPackage />
            Bin {activeBin === bin && !isSampleRunning ? "…" : bin}
          </Button>
        ))}
      </div>
    </div>
  );
}
