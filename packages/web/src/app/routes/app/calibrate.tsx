import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { modulesQueryOptions } from "@/features/calibration/api/module-configs";
import { useModuleConfigs } from "@/features/calibration/api/use-module-configs";
import { MODULES, SERVOS } from "@/features/calibration/constants";
import type {
  ActivePositions,
  ServoConfig,
  SliderKey,
} from "@/features/calibration/types";
import { useSerial } from "@/features/scanner/api/use-serial";
import { ServoCalibration } from "@magic-vault/shared";
import { IconRotateClockwise } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

function defaultSliderValues(): Record<SliderKey, number> {
  const vals = {} as Record<SliderKey, number>;
  for (const m of MODULES) {
    vals[`${m}:bottom`] = 307;
    vals[`${m}:paddle`] = 307;
    vals[`${m}:pusher`] = 307;
  }
  return vals;
}

export default function CalibratePage() {
  const { isConnected, sendCommand } = useSerial();
  const { configs, saveConfig, moveServo } = useModuleConfigs();
  const { isLoading } = useQuery(modulesQueryOptions);
  const [active, setActive] = useState<ActivePositions>({});
  const activeRef = useRef(active);
  activeRef.current = active;
  const [sliderValues, setSliderValues] =
    useState<Record<SliderKey, number>>(defaultSliderValues);
  const servoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleControl = useCallback(
    (module: number, servo: string, position: string) => {
      const key = `${module}:${servo}`;
      const current = activeRef.current[key];
      if (current === position) {
        sendCommand(JSON.stringify({ servo, module, position: "neutral" }));
        setActive((prev) => ({ ...prev, [key]: null }));
      } else {
        sendCommand(JSON.stringify({ servo, module, position }));
        setActive((prev) => ({ ...prev, [key]: position }));
      }
    },
    [sendCommand],
  );

  const handleReset = useCallback(
    (module: number, servo: ServoConfig) => {
      sendCommand(
        JSON.stringify({
          servo: servo.name,
          module,
          position: servo.defaultPosition,
        }),
      );
      setActive((prev) => ({ ...prev, [`${module}:${servo.name}`]: null }));
    },
    [sendCommand],
  );

  const handleSliderChange = useCallback(
    (
      module: 1 | 2 | 3,
      servo: "bottom" | "paddle" | "pusher",
      value: number,
    ) => {
      setSliderValues((prev) => ({ ...prev, [`${module}:${servo}`]: value }));
      if (servoDebounceRef.current) clearTimeout(servoDebounceRef.current);
      servoDebounceRef.current = setTimeout(
        () => moveServo(module, servo, value),
        30,
      );
    },
    [moveServo],
  );

  const handleSetPosition = useCallback(
    (module: 1 | 2 | 3, posKey: keyof ServoCalibration, value: number) => {
      const config = configs.find((c) => c.moduleNumber === module);
      if (!config) return;
      saveConfig(module, { ...config.calibration, [posKey]: value });
    },
    [configs, saveConfig],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 rounded-lg border overflow-hidden">
        {MODULES.map((module) => {
          const config = configs.find((c) => c.moduleNumber === module);
          const cal = config?.calibration;
          return (
            <div
              key={module}
              className="p-4 flex flex-col gap-5 border-b md:border-b-0 md:border-r last:border-0 bg-sidebar"
            >
              <h2 className="text-sm font-bold">Module {module}</h2>
              {SERVOS.map((servo) => {
                const sliderKey = `${module}:${servo.name}` as SliderKey;
                const sliderValue = sliderValues[sliderKey] ?? 307;
                return (
                  <div key={servo.name} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {servo.label}
                      </p>
                      <button
                        disabled={!isConnected}
                        onClick={() => handleReset(module, servo)}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={`Reset to ${servo.defaultPosition}`}
                      >
                        <IconRotateClockwise size={12} />
                      </button>
                    </div>
                    <ButtonGroup className="w-full">
                      {servo.controlPositions.map((position) => {
                        const key = `${module}:${servo.name}`;
                        const isActive = active[key] === position;
                        return (
                          <Button
                            key={position}
                            variant={isActive ? "default" : "outline"}
                            disabled={!isConnected}
                            onClick={() =>
                              handleControl(module, servo.name, position)
                            }
                            className="flex-1"
                          >
                            {position.toUpperCase()}
                          </Button>
                        );
                      })}
                    </ButtonGroup>
                    <ButtonGroup className="w-full">
                      <Button
                        variant="outline"
                        disabled={!isConnected || sliderValue <= 120}
                        onClick={() =>
                          handleSliderChange(
                            module,
                            servo.name,
                            Math.max(120, sliderValue - 10),
                          )
                        }
                        className="px-2 text-xs"
                      >
                        -10
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!isConnected || sliderValue <= 120}
                        onClick={() =>
                          handleSliderChange(
                            module,
                            servo.name,
                            sliderValue - 1,
                          )
                        }
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
                        variant="outline"
                        disabled={!isConnected || sliderValue >= 490}
                        onClick={() =>
                          handleSliderChange(
                            module,
                            servo.name,
                            sliderValue + 1,
                          )
                        }
                        className="px-2"
                      >
                        +
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!isConnected || sliderValue >= 490}
                        onClick={() =>
                          handleSliderChange(
                            module,
                            servo.name,
                            Math.min(490, sliderValue + 10),
                          )
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
                          variant="outline"
                          disabled={!isConnected}
                          onClick={() =>
                            handleSetPosition(module, pos.key, sliderValue)
                          }
                          className="flex-1"
                        >
                          {pos.label}
                        </Button>
                      ))}
                    </ButtonGroup>
                    {isLoading ? (
                      <Skeleton className="h-3 w-32 rounded" />
                    ) : cal ? (
                      <div className="text-xs text-muted-foreground w-full flex">
                        {servo.calibrationPositions.map((pos) => (
                          <p className="flex-1 text-center" key={pos.key}>
                            {cal[pos.key]}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
