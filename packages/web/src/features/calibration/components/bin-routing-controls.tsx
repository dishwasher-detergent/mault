import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconPackage } from "@tabler/icons-react";

const BINS = [1, 2, 3, 4, 5, 6, 7] as const;

interface BinRoutingControlsProps {
  activeBin: number | null;
  isConnected: boolean;
  onTestBin: (bin: number) => void;
  onFeed: () => void;
}

export function BinRoutingControls({
  activeBin,
  isConnected,
  onTestBin,
  onFeed,
}: BinRoutingControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Bin Routing</Label>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={!isConnected}
          onClick={onFeed}
        >
          Feed
        </Button>
        {BINS.map((bin) => (
          <Button
            key={bin}
            variant={activeBin === bin ? "default" : "outline"}
            disabled={!isConnected || activeBin !== null}
            onClick={() => onTestBin(bin)}
          >
            <IconPackage />
            Bin {activeBin === bin ? "…" : bin}
          </Button>
        ))}
      </div>
    </div>
  );
}
