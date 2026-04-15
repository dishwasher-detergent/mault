import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface IrSensorPanelProps {
  irStates: boolean[] | null;
  isConnected: boolean;
  isMonitoring: boolean;
  onRead: () => void;
  onToggleMonitor: () => void;
}

export function IrSensorPanel({
  irStates,
  isConnected,
  isMonitoring,
  onRead,
  onToggleMonitor,
}: IrSensorPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>IR Sensors</Label>
      <div className="flex items-center gap-3">
        <Button
          variant={isMonitoring ? "default" : "outline"}
          disabled={!isConnected}
          onClick={onToggleMonitor}
        >
          {isMonitoring ? "Stop" : "Monitor"}
        </Button>
        {!isMonitoring && (
          <Button variant="outline" disabled={!isConnected} onClick={onRead}>
            Read
          </Button>
        )}
        {([1, 2, 3] as const).map((m) => {
          const detected = irStates?.[m - 1];
          return (
            <div key={m} className="flex items-center gap-1.5">
              <Badge variant={detected ? "success" : "ghost"}>Module {m}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
