import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IrSensorPanelProps {
  irStates: boolean[] | null;
  hopperHasCards: boolean | null;
  isConnected: boolean;
  isMonitoring: boolean;
  onRead: () => void;
  onToggleMonitor: () => void;
}

export function IrSensorPanel({
  irStates,
  hopperHasCards,
  isConnected,
  isMonitoring,
  onRead,
  onToggleMonitor,
}: IrSensorPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <Tooltip>
        <TooltipTrigger
          render={<Label className="w-fit">IR Sensors</Label>}
        />
        <TooltipContent>
          Infrared sensors that detect when a card is present at each
          module's feed path
        </TooltipContent>
      </Tooltip>
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={isMonitoring ? "default" : "outline"}
                disabled={!isConnected}
                onClick={onToggleMonitor}
              >
                {isMonitoring ? "Stop" : "Monitor"}
              </Button>
            }
          />
          <TooltipContent>
            Continuously poll the IR sensors and update the badges below in
            real time
          </TooltipContent>
        </Tooltip>
        {!isMonitoring && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  disabled={!isConnected}
                  onClick={onRead}
                >
                  Read
                </Button>
              }
            />
            <TooltipContent>
              Take a single snapshot reading of the IR sensors
            </TooltipContent>
          </Tooltip>
        )}
        {([1, 2, 3] as const).map((m) => {
          const detected = irStates?.[m - 1];
          return (
            <Tooltip key={m}>
              <TooltipTrigger
                render={
                  <div className="flex items-center gap-1.5">
                    <Badge variant={detected ? "success" : "ghost"}>
                      Module {m}
                    </Badge>
                  </div>
                }
              />
              <TooltipContent>
                {detected
                  ? `A card is currently detected at Module ${m}'s IR sensor`
                  : `No card currently detected at Module ${m}'s IR sensor`}
              </TooltipContent>
            </Tooltip>
          );
        })}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1.5">
                <Badge variant={hopperHasCards ? "success" : "ghost"}>
                  {hopperHasCards === false ? "Hopper empty" : "Hopper"}
                </Badge>
              </div>
            }
          />
          <TooltipContent>
            Whether the card hopper's IR sensor currently detects cards
            waiting to be fed
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
