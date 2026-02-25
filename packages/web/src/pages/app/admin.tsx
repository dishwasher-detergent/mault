import { Button } from "@/components/ui/button";
import { useModuleConfigs } from "@/hooks/use-module-configs";
import { useSerial } from "@/hooks/use-serial";
import { ServoCalibration } from "-vault/shared";
import { cn } from "@/lib/utils";
import { IconRotateClockwise } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";

interface ServoConfig {
  name: string;
  label: string;
  positions: string[];
  defaultPosition: string;
}

const MODULES = [1, 2, 3] as const;

const SERVOS: ServoConfig[] = [
  {
    name: "bottom",
    label: "Bottom Paddle",
    positions: ["open"],
    defaultPosition: "open",
  },
  {
    name: "paddle",
    label: "Paddles",
    positions: ["open"],
    defaultPosition: "open",
  },
  {
    name: "pusher",
    label: "Pushers",
    positions: ["left", "right"],
    defaultPosition: "neutral",
  },
];

type ActivePositions = Record<string, string | null>;

interface CalibrateServo {
  name: "bottom" | "paddle" | "pusher";
  label: string;
  positions: { label: string; key: keyof ServoCalibration }[];
}

const CALIBRATE_SERVOS: CalibrateServo[] = [
  {
    name: "bottom",
    label: "Bottom Paddle",
    positions: [
      { label: "Set Closed", key: "bottomClosed" },
      { label: "Set Open", key: "bottomOpen" },
    ],
  },
  {
    name: "paddle",
    label: "Paddles",
    positions: [
      { label: "Set Closed", key: "paddleClosed" },
      { label: "Set Open", key: "paddleOpen" },
    ],
  },
  {
    name: "pusher",
    label: "Pusher",
    positions: [
      { label: "Set Left", key: "pusherLeft" },
      { label: "Set Neutral", key: "pusherNeutral" },
      { label: "Set Right", key: "pusherRight" },
    ],
  },
];

type SliderKey = `${1 | 2 | 3}:${"bottom" | "paddle" | "pusher"}`;

function defaultSliderValues(): Record<SliderKey, number> {
  const vals = {} as Record<SliderKey, number>;
  for (const m of MODULES) {
    vals[`${m}:bottom`] = 307;
    vals[`${m}:paddle`] = 307;
    vals[`${m}:pusher`] = 307;
  }
  return vals;
}

export default function AdminPage() {
  const { isConnected, connect, disconnect, sendCommand } = useSerial();
  const { configs, saveConfig, moveServo } = useModuleConfigs();
  const [activeTab, setActiveTab] = useState<"control" | "calibrate">(
    "control",
  );
  const [active, setActive] = useState<ActivePositions>({});
  const activeRef = useRef(active);
  activeRef.current = active;
  const [sliderValues, setSliderValues] =
    useState<Record<SliderKey, number>>(defaultSliderValues);

  const handleServo = useCallback(
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

  const handleResetServo = useCallback(
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

  const servoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab("control")}
            className={cn(
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
              activeTab === "control"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Control
          </button>
          <button
            onClick={() => setActiveTab("calibrate")}
            className={cn(
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
              activeTab === "calibrate"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Calibrate
          </button>
        </div>
        <Button
          variant={isConnected ? "destructive" : "default"}
          onClick={isConnected ? disconnect : connect}
        >
          {isConnected ? "Disconnect" : "Connect USB"}
        </Button>
      </div>

      {activeTab === "control" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODULES.map((module) => (
              <div
                key={module}
                className="rounded-lg border p-4 flex flex-col gap-4"
              >
                <h2 className="text-sm font-bold">Module {module}</h2>
                {SERVOS.map((servo) => (
                  <div key={servo.name} className="flex flex-col gap-1.5">
                    <p className="text-xs text-muted-foreground">
                      {servo.label}
                    </p>
                    <div className="flex gap-2">
                      {servo.positions.map((position) => {
                        const key = `${module}:${servo.name}`;
                        const isActive = active[key] === position;
                        return (
                          <Button
                            key={position}
                            variant={isActive ? "default" : "outline"}
                            size="lg"
                            disabled={!isConnected}
                            onClick={() =>
                              handleServo(module, servo.name, position)
                            }
                            className="flex-1"
                          >
                            {position.toUpperCase()}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "calibrate" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODULES.map((module) => {
              const config = configs.find((c) => c.moduleNumber === module);
              const cal = config?.calibration;
              return (
                <div
                  key={module}
                  className="rounded-lg border p-4 flex flex-col gap-5"
                >
                  <h2 className="text-sm font-bold">Module {module}</h2>
                  {CALIBRATE_SERVOS.map((servo) => {
                    const sliderKey = `${module}:${servo.name}` as SliderKey;
                    const sliderValue = sliderValues[sliderKey] ?? 307;
                    const servoDefault = SERVOS.find(
                      (s) => s.name === servo.name,
                    )!;
                    return (
                      <div key={servo.name} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {servo.label}
                          </p>
                          <button
                            disabled={!isConnected}
                            onClick={() =>
                              handleResetServo(module, servoDefault)
                            }
                            className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title={`Reset to ${servoDefault.defaultPosition}`}
                          >
                            <IconRotateClockwise size={12} />
                          </button>
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
                          {servo.positions.map((pos) => (
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
                        {cal && (
                          <p className="text-xs text-muted-foreground">
                            {servo.positions.map((pos, i) => (
                              <span key={pos.key}>
                                {i > 0 && "  ·  "}
                                {pos.label.replace("Set ", "")}={cal[pos.key]}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
