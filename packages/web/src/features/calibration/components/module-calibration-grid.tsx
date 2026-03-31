import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { MODULES, SERVOS } from "@/features/calibration/constants";
import type {
  ActivePositions,
  ServoConfig,
  SliderKey,
} from "@/features/calibration/types";
import type { ModuleConfig, ServoCalibration } from "@magic-vault/shared";
import {
  IconLayoutAlignCenter,
  IconRotateClockwise,
} from "@tabler/icons-react";

interface ServoControlProps {
  module: 1 | 2 | 3;
  servo: ServoConfig;
  sliderValue: number;
  activePosition: string | null | undefined;
  calibration: ServoCalibration | undefined;
  isLoading: boolean;
  isConnected: boolean;
  onControl: (
    module: 1 | 2 | 3,
    servo: "bottom" | "paddle" | "pusher",
    position: string,
  ) => void;
  onReset: (module: number, servo: ServoConfig) => void;
  onSliderChange: (
    module: 1 | 2 | 3,
    servo: "bottom" | "paddle" | "pusher",
    value: number,
  ) => void;
  onSetPosition: (
    module: 1 | 2 | 3,
    posKey: keyof ServoCalibration,
    value: number,
  ) => void;
}

function ServoControl({
  module,
  servo,
  sliderValue,
  activePosition,
  calibration,
  isLoading,
  isConnected,
  onControl,
  onReset,
  onSliderChange,
  onSetPosition,
}: ServoControlProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{servo.label}</p>
        <button
          disabled={!isConnected}
          onClick={() => onReset(module, servo)}
          className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={`Reset to ${servo.defaultPosition}`}
        >
          <IconRotateClockwise size={12} />
        </button>
      </div>

      <ButtonGroup className="w-full">
        {servo.controlPositions.map((position) => (
          <Button
            key={position}
            variant={activePosition === position ? "default" : "secondary"}
            disabled={!isConnected}
            onClick={() => onControl(module, servo.name, position)}
            className="flex-1"
          >
            {position.toUpperCase()}
          </Button>
        ))}
      </ButtonGroup>

      <ButtonGroup className="w-full">
        <Button
          variant="secondary"
          disabled={!isConnected || sliderValue <= 120}
          onClick={() =>
            onSliderChange(module, servo.name, Math.max(120, sliderValue - 10))
          }
          className="px-2 text-xs"
        >
          -10
        </Button>
        <Button
          variant="secondary"
          disabled={!isConnected || sliderValue <= 120}
          onClick={() => onSliderChange(module, servo.name, sliderValue - 1)}
          className="px-2"
        >
          -
        </Button>
        <div className="flex flex-row flex-1 bg-background border-y justify-between px-2 items-center">
          <p className="text-xs text-muted-foreground">120</p>
          <p className="font-bold text-sm">{sliderValue}</p>
          <p className="text-xs text-muted-foreground">490</p>
        </div>
        <Button
          variant="secondary"
          disabled={!isConnected || sliderValue >= 490}
          onClick={() => onSliderChange(module, servo.name, sliderValue + 1)}
          className="px-2"
        >
          +
        </Button>
        <Button
          variant="secondary"
          disabled={!isConnected || sliderValue >= 490}
          onClick={() =>
            onSliderChange(module, servo.name, Math.min(490, sliderValue + 10))
          }
          className="px-2 text-xs"
        >
          +10
        </Button>
      </ButtonGroup>

      <ButtonGroup className="w-full">
        {servo.calibrationPositions.map((pos) => (
          <Button
            key={pos.key}
            variant="secondary"
            disabled={!isConnected}
            onClick={() => onSetPosition(module, pos.key, sliderValue)}
            className="flex-1"
          >
            {pos.label}
          </Button>
        ))}
      </ButtonGroup>

      {isLoading ? (
        <Skeleton className="h-3 w-32 rounded" />
      ) : calibration ? (
        <div className="text-xs text-muted-foreground w-full flex">
          {servo.calibrationPositions.map((pos) => (
            <p className="flex-1 text-center" key={pos.key}>
              {calibration[pos.key]}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface ModuleCalibrationGridProps {
  configs: ModuleConfig[];
  active: ActivePositions;
  sliderValues: Record<SliderKey, number>;
  isLoading: boolean;
  isConnected: boolean;
  onControl: (
    module: 1 | 2 | 3,
    servo: "bottom" | "paddle" | "pusher",
    position: string,
  ) => void;
  onReset: (module: number, servo: ServoConfig) => void;
  onSliderChange: (
    module: 1 | 2 | 3,
    servo: "bottom" | "paddle" | "pusher",
    value: number,
  ) => void;
  onSetPosition: (
    module: 1 | 2 | 3,
    posKey: keyof ServoCalibration,
    value: number,
  ) => void;
  onCenter: (module: 1 | 2 | 3) => void;
}

export function ModuleCalibrationGrid({
  configs,
  active,
  sliderValues,
  isLoading,
  isConnected,
  onControl,
  onReset,
  onSliderChange,
  onSetPosition,
  onCenter,
}: ModuleCalibrationGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 rounded-lg border overflow-hidden">
      {MODULES.map((module) => {
        const cal = configs.find((c) => c.moduleNumber === module)?.calibration;
        return (
          <div
            key={module}
            className="p-2 flex flex-col gap-5 border-b md:border-b-0 md:border-r last:border-0 bg-sidebar"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Module {module}</h2>
              <button
                disabled={!isConnected}
                onClick={() => onCenter(module)}
                className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Center all servos"
              >
                <IconLayoutAlignCenter size={14} />
              </button>
            </div>
            {SERVOS.map((servo) => {
              const sliderKey = `${module}:${servo.name}` as SliderKey;
              return (
                <ServoControl
                  key={servo.name}
                  module={module}
                  servo={servo}
                  sliderValue={sliderValues[sliderKey] ?? 307}
                  activePosition={active[sliderKey]}
                  calibration={cal}
                  isLoading={isLoading}
                  isConnected={isConnected}
                  onControl={onControl}
                  onReset={onReset}
                  onSliderChange={onSliderChange}
                  onSetPosition={onSetPosition}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
