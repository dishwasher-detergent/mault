import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconBulb, IconBulbFilled } from "@tabler/icons-react";

interface LedControlsProps {
  ledStates: Record<1 | 2 | 3 | 4, boolean>;
  isConnected: boolean;
  onToggle: (led: 1 | 2 | 3 | 4) => void;
}

export function LedControls({ ledStates, isConnected, onToggle }: LedControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>LEDs</Label>
      <div className="flex items-center gap-2">
        {([1, 2, 3, 4] as const).map((led) => (
          <Button
            key={led}
            variant={ledStates[led] ? "default" : "outline"}
            disabled={!isConnected}
            onClick={() => onToggle(led)}
          >
            {ledStates[led] ? <IconBulbFilled /> : <IconBulb />}
            LED {led}
          </Button>
        ))}
      </div>
    </div>
  );
}
