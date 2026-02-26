import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { modulesQueryOptions } from "@/features/calibration/api/module-configs";
import { useModuleConfigs } from "@/features/calibration/api/use-module-configs";
import { MODULES, SERVOS } from "@/features/calibration/constants";
import type { ActivePositions, SliderKey } from "@/features/calibration/types";
import { useQuery } from "@tanstack/react-query";
import { useSerial } from "@/features/scanner/api/use-serial";
import { IconRotateClockwise } from "@tabler/icons-react";
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
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 rounded-lg border overflow-hidden">
        {MODULES.map((module) => {
          const config = configs.find((c) => c.moduleNumber === module);
          const cal = config?.calibration;
          return (
            <div
              key={module}
              className="p-4 flex flex-col gap-5 border-b md:border-b-0 md:border-r last:border-0"
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
                    <div className="flex gap-1.5">
                      {servo.controlPositions.map((position) => {
                        const key = `${module}:${servo.name}`;
                        const isActive = active[key] === position;
                        return (
                          <Button
                            key={position}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
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
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={120}
                        max={490}
                        step={1}
                        value={sliderValue}
                        disabled={!isConnected}
                        onChange={(e) =>
                          handleSliderChange(
                            module,
                            servo.name,
                            parseInt(e.target.value),
                          )
                        }
                        className="flex-1 accent-foreground"
                      />
                      <span className="text-xs tabular-nums w-8 text-right">
                        {sliderValue}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {servo.calibrationPositions.map((pos) => (
                        <Button
                          key={pos.key}
                          size="sm"
                          variant="outline"
                          disabled={!isConnected}
                          onClick={() =>
                            handleSetPosition(module, pos.key, sliderValue)
                          }
                        >
                          {pos.label}
                        </Button>
                      ))}
                    </div>
                    {isLoading ? (
                      <Skeleton className="h-3 w-32 rounded" />
                    ) : cal ? (
                      <p className="text-xs text-muted-foreground">
                        {servo.calibrationPositions.map((pos, i) => (
                          <span key={pos.key}>
                            {i > 0 && "  ·  "}
                            {pos.label.replace("Set ", "")}={cal[pos.key]}
                          </span>
                        ))}
                      </p>
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
