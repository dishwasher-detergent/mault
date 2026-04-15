import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeederCalibration } from "@magic-vault/shared";

interface FeederCalibrationPanelProps {
  speedValue: number;
  durationValue: number;
  pulseDurationValue: number;
  pauseDurationValue: number;
  calibration: FeederCalibration | undefined;
  isLoading: boolean;
  isConnected: boolean;
  onSpeedChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onPulseDurationChange: (value: number) => void;
  onPauseDurationChange: (value: number) => void;
  onSetSpeed: () => void;
  onSetDuration: () => void;
  onSetPulseDuration: () => void;
  onSetPauseDuration: () => void;
}

export function FeederCalibrationPanel({
  speedValue,
  durationValue,
  pulseDurationValue,
  pauseDurationValue,
  calibration,
  isLoading,
  isConnected,
  onSpeedChange,
  onDurationChange,
  onPulseDurationChange,
  onPauseDurationChange,
  onSetSpeed,
  onSetDuration,
  onSetPulseDuration,
  onSetPauseDuration,
}: FeederCalibrationPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3">
      <div className="rounded-lg border bg-sidebar p-2 flex flex-col gap-5">
        <h2 className="text-sm font-bold font-heading">Feeder</h2>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Speed (PWM)</p>
          <ButtonGroup className="w-full">
            <Button
              variant="secondary"
              disabled={!isConnected || speedValue <= 120}
              onClick={() => onSpeedChange(Math.max(120, speedValue - 10))}
              className="px-2 text-xs"
            >
              -10
            </Button>
            <Button
              variant="secondary"
              disabled={!isConnected || speedValue <= 120}
              onClick={() => onSpeedChange(speedValue - 1)}
              className="px-2"
            >
              -
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-between px-2 items-center">
              <p className="text-xs text-muted-foreground">120</p>
              <p className="font-bold text-sm">{speedValue}</p>
              <p className="text-xs text-muted-foreground">490</p>
            </div>
            <Button
              variant="secondary"
              disabled={!isConnected || speedValue >= 490}
              onClick={() => onSpeedChange(speedValue + 1)}
              className="px-2"
            >
              +
            </Button>
            <Button
              variant="secondary"
              disabled={!isConnected || speedValue >= 490}
              onClick={() => onSpeedChange(Math.min(490, speedValue + 10))}
              className="px-2 text-xs"
            >
              +10
            </Button>
          </ButtonGroup>
          <ButtonGroup className="w-full">
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={onSetSpeed}
              className="flex-1"
            >
              Set Speed
            </Button>
          </ButtonGroup>
          {isLoading ? (
            <Skeleton className="h-3 w-16 rounded" />
          ) : calibration ? (
            <p className="text-xs text-muted-foreground text-center">
              {calibration.speed}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Timeout (ms)</p>
          <ButtonGroup className="w-full">
            <Button
              variant="secondary"
              disabled={!isConnected || durationValue <= 10}
              onClick={() =>
                onDurationChange(Math.max(10, durationValue - 100))
              }
              className="px-2 text-xs"
            >
              -100
            </Button>
            <Button
              variant="secondary"
              disabled={!isConnected || durationValue <= 10}
              onClick={() => onDurationChange(Math.max(10, durationValue - 10))}
              className="px-2 text-xs"
            >
              -10
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-center px-2 items-center">
              <p className="font-bold text-sm">{durationValue} ms</p>
            </div>
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={() => onDurationChange(durationValue + 10)}
              className="px-2 text-xs"
            >
              +10
            </Button>
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={() => onDurationChange(durationValue + 100)}
              className="px-2 text-xs"
            >
              +100
            </Button>
          </ButtonGroup>
          <ButtonGroup className="w-full">
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={onSetDuration}
              className="flex-1"
            >
              Set Timeout
            </Button>
          </ButtonGroup>
          {isLoading ? (
            <Skeleton className="h-3 w-16 rounded" />
          ) : calibration ? (
            <p className="text-xs text-muted-foreground text-center">
              {calibration.duration} ms
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Pulse Duration (ms)</p>
          <ButtonGroup className="w-full">
            <Button
              variant="secondary"
              disabled={!isConnected || pulseDurationValue <= 10}
              onClick={() => onPulseDurationChange(Math.max(10, pulseDurationValue - 10))}
              className="px-2 text-xs"
            >
              -10
            </Button>
            <Button
              variant="secondary"
              disabled={!isConnected || pulseDurationValue <= 10}
              onClick={() => onPulseDurationChange(Math.max(10, pulseDurationValue - 1))}
              className="px-2"
            >
              -
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-center px-2 items-center">
              <p className="font-bold text-sm">{pulseDurationValue} ms</p>
            </div>
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={() => onPulseDurationChange(pulseDurationValue + 1)}
              className="px-2"
            >
              +
            </Button>
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={() => onPulseDurationChange(pulseDurationValue + 10)}
              className="px-2 text-xs"
            >
              +10
            </Button>
          </ButtonGroup>
          <ButtonGroup className="w-full">
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={onSetPulseDuration}
              className="flex-1"
            >
              Set Pulse Duration
            </Button>
          </ButtonGroup>
          {isLoading ? (
            <Skeleton className="h-3 w-16 rounded" />
          ) : calibration ? (
            <p className="text-xs text-muted-foreground text-center">
              {calibration.pulseDuration} ms
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Pause Duration (ms)</p>
          <ButtonGroup className="w-full">
            <Button
              variant="secondary"
              disabled={!isConnected || pauseDurationValue <= 10}
              onClick={() => onPauseDurationChange(Math.max(10, pauseDurationValue - 10))}
              className="px-2 text-xs"
            >
              -10
            </Button>
            <Button
              variant="secondary"
              disabled={!isConnected || pauseDurationValue <= 10}
              onClick={() => onPauseDurationChange(Math.max(10, pauseDurationValue - 1))}
              className="px-2"
            >
              -
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-center px-2 items-center">
              <p className="font-bold text-sm">{pauseDurationValue} ms</p>
            </div>
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={() => onPauseDurationChange(pauseDurationValue + 1)}
              className="px-2"
            >
              +
            </Button>
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={() => onPauseDurationChange(pauseDurationValue + 10)}
              className="px-2 text-xs"
            >
              +10
            </Button>
          </ButtonGroup>
          <ButtonGroup className="w-full">
            <Button
              variant="secondary"
              disabled={!isConnected}
              onClick={onSetPauseDuration}
              className="flex-1"
            >
              Set Pause Duration
            </Button>
          </ButtonGroup>
          {isLoading ? (
            <Skeleton className="h-3 w-16 rounded" />
          ) : calibration ? (
            <p className="text-xs text-muted-foreground text-center">
              {calibration.pauseDuration} ms
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
