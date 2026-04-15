import { modulesQueryOptions } from "@/features/calibration/api/module-configs";
import { useFeederConfig } from "@/features/calibration/api/use-feeder-config";
import { useModuleConfigs } from "@/features/calibration/api/use-module-configs";
import { SERVOS } from "@/features/calibration/constants";
import {
  defaultSliderValues,
  getCalibrationKey,
} from "@/features/calibration/lib/calibration-utils";
import type { ActivePositions, ServoConfig, SliderKey } from "@/features/calibration/types";
import { useSerial } from "@/features/scanner/api/use-serial";
import type { ServoCalibration } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useCalibrationPage() {
  const { isConnected, connect, disconnect, sendCommand, sendBin, sendTest, receiveResponse } =
    useSerial();
  const { configs, saveConfig, moveServo } = useModuleConfigs();
  const { feederConfig, saveConfig: saveFeeder, previewSpeed } = useFeederConfig();
  const { isLoading } = useQuery(modulesQueryOptions);

  const [active, setActive] = useState<ActivePositions>({});
  const activeRef = useRef(active);
  activeRef.current = active;

  const configsRef = useRef(configs);
  configsRef.current = configs;

  const [sliderValues, setSliderValues] =
    useState<Record<SliderKey, number>>(defaultSliderValues);

  const servoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ledStates, setLedStates] = useState<Record<1 | 2 | 3 | 4, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  const [activeBin, setActiveBinState] = useState<number | null>(null);
  const activeBinRef = useRef<number | null>(null);
  const setActiveBin = useCallback((v: number | null) => {
    activeBinRef.current = v;
    setActiveBinState(v);
  }, []);

  const [isTesting, setIsTesting] = useState(false);
  const [isSampleRunning, setIsSampleRunning] = useState(false);

  const [irStates, setIrStates] = useState<boolean[] | null>(null);
  const [irMonitoring, setIrMonitoring] = useState(false);
  const irBusyRef = useRef(false);

  const [feederSpeedValue, setFeederSpeedValue] = useState(feederConfig.speed);
  const [feederDurationValue, setFeederDurationValue] = useState(feederConfig.duration);
  const [feederPulseDurationValue, setFeederPulseDurationValue] = useState(feederConfig.pulseDuration);
  const [feederPauseDurationValue, setFeederPauseDurationValue] = useState(feederConfig.pauseDuration);
  const feederDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleControl = useCallback(
    (
      module: 1 | 2 | 3,
      servo: "bottom" | "paddle" | "pusher",
      position: string,
    ) => {
      const key = `${module}:${servo}`;
      const current = activeRef.current[key];
      const isToggleOff = current === position;

      sendCommand(
        JSON.stringify({
          servo,
          module,
          position: isToggleOff ? "neutral" : position,
        }),
      );
      setActive((prev) => ({ ...prev, [key]: isToggleOff ? null : position }));

      const cal = configsRef.current.find(
        (c) => c.moduleNumber === module,
      )?.calibration;
      if (cal) {
        const calKey = getCalibrationKey(servo, isToggleOff ? "neutral" : position);
        if (calKey) {
          setSliderValues((prev) => ({ ...prev, [key]: cal[calKey] }));
        }
      }
    },
    [sendCommand],
  );

  const handleReset = useCallback(
    (module: number, servo: ServoConfig) => {
      sendCommand(
        JSON.stringify({ servo: servo.name, module, position: servo.defaultPosition }),
      );
      setActive((prev) => ({ ...prev, [`${module}:${servo.name}`]: null }));
    },
    [sendCommand],
  );

  const handleSliderChange = useCallback(
    (module: 1 | 2 | 3, servo: "bottom" | "paddle" | "pusher", value: number) => {
      setSliderValues((prev) => ({ ...prev, [`${module}:${servo}`]: value }));
      if (servoDebounceRef.current) clearTimeout(servoDebounceRef.current);
      servoDebounceRef.current = setTimeout(() => moveServo(module, servo, value), 30);
    },
    [moveServo],
  );

  const handleLedToggle = useCallback(
    (led: 1 | 2 | 3 | 4) => {
      const next = !ledStates[led];
      sendCommand(JSON.stringify({ led, on: next }));
      setLedStates((prev) => ({ ...prev, [led]: next }));
    },
    [ledStates, sendCommand],
  );

  const handleTest = useCallback(async () => {
    setIsTesting(true);
    toast.info("Running test sequence…");
    const ok = await sendTest();
    setIsTesting(false);
    if (ok) {
      toast.success("Test complete");
    } else {
      toast.error("Test failed", { description: "No response from sorter." });
    }
  }, [sendTest]);

  const handleTestBin = useCallback(
    async (bin: number) => {
      setActiveBin(bin);
      try {
        const response = await sendBin(bin);
        if (!response) {
          toast.error(`Bin ${bin} failed`, {
            description: "No response from sorter.",
          });
        } else if (typeof response === "object" && "error" in response) {
          toast.error(`Bin ${bin} failed`, {
            description: (response as { error: string }).error,
          });
        }
      } finally {
        setActiveBin(null);
      }
    },
    [sendBin],
  );

  const handleSampleRun = useCallback(async () => {
    setIsSampleRunning(true);
    toast.info("Starting sample run…");
    try {
      for (let bin = 1; bin <= 7; bin++) {
        setActiveBin(bin);
        const response = await sendBin(bin);
        if (!response) {
          toast.error(`Sample run stopped at bin ${bin}`, {
            description: "No response from sorter.",
          });
          return;
        }
        if (typeof response === "object" && "error" in response) {
          toast.error(`Sample run stopped at bin ${bin}`, {
            description: (response as { error: string }).error,
          });
          return;
        }
        // Brief pause between cards so the mechanism fully resets
        await new Promise<void>((r) => setTimeout(r, 500));
      }
      toast.success("Sample run complete");
    } finally {
      setActiveBin(null);
      setIsSampleRunning(false);
    }
  }, [sendBin]);

  const handleCenterModule = useCallback(
    (module: 1 | 2 | 3) => {
      const CENTER = 307;
      for (const servo of SERVOS) {
        moveServo(module, servo.name, CENTER);
      }
      setSliderValues((prev) => ({
        ...prev,
        [`${module}:bottom`]: CENTER,
        [`${module}:paddle`]: CENTER,
        [`${module}:pusher`]: CENTER,
      }));
    },
    [moveServo],
  );

  const handleSetPosition = useCallback(
    (module: 1 | 2 | 3, posKey: keyof ServoCalibration, value: number) => {
      const config = configsRef.current.find((c) => c.moduleNumber === module);
      if (!config) return;
      saveConfig(module, { ...config.calibration, [posKey]: value });
    },
    [saveConfig],
  );

  const handleFeederSpeedChange = useCallback(
    (value: number) => {
      setFeederSpeedValue(value);
      if (feederDebounceRef.current) clearTimeout(feederDebounceRef.current);
      feederDebounceRef.current = setTimeout(() => previewSpeed(value), 30);
    },
    [previewSpeed],
  );

  const handleFeederDurationChange = useCallback((value: number) => {
    setFeederDurationValue(value);
  }, []);

  const handleFeederPulseDurationChange = useCallback((value: number) => {
    setFeederPulseDurationValue(value);
  }, []);

  const handleFeederPauseDurationChange = useCallback((value: number) => {
    setFeederPauseDurationValue(value);
  }, []);

  const handleFeederSetSpeed = useCallback(() => {
    saveFeeder({ ...feederConfig, speed: feederSpeedValue });
  }, [feederConfig, feederSpeedValue, saveFeeder]);

  const handleFeederSetDuration = useCallback(() => {
    saveFeeder({ ...feederConfig, duration: feederDurationValue });
  }, [feederConfig, feederDurationValue, saveFeeder]);

  const handleFeederSetPulseDuration = useCallback(() => {
    saveFeeder({ ...feederConfig, pulseDuration: feederPulseDurationValue });
  }, [feederConfig, feederPulseDurationValue, saveFeeder]);

  const handleFeederSetPauseDuration = useCallback(() => {
    saveFeeder({ ...feederConfig, pauseDuration: feederPauseDurationValue });
  }, [feederConfig, feederPauseDurationValue, saveFeeder]);

  const handleFeed = useCallback(() => {
    sendCommand(JSON.stringify({ feeder: true }));
  }, [sendCommand]);

  const readIR = useCallback(async () => {
    if (irBusyRef.current || activeBinRef.current !== null) return;
    irBusyRef.current = true;
    try {
      const sent = await sendCommand(JSON.stringify({ readIR: true }));
      if (!sent) return;
      const response = await receiveResponse(2000);
      if (!response) return;
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed.ir)) setIrStates(parsed.ir as boolean[]);
    } catch {
      // ignore parse errors
    } finally {
      irBusyRef.current = false;
    }
  }, [sendCommand, receiveResponse]);

  const handleToggleIrMonitor = useCallback(() => {
    setIrMonitoring((prev) => !prev);
  }, []);

  // Poll IR sensors every 300 ms while monitoring is active
  useEffect(() => {
    if (!irMonitoring || !isConnected) return;
    const id = setInterval(() => {
      void readIR();
    }, 300);
    return () => clearInterval(id);
  }, [irMonitoring, isConnected, readIR]);

  // Reset IR state when disconnected
  useEffect(() => {
    if (!isConnected) {
      setIrMonitoring(false);
      setIrStates(null);
    }
  }, [isConnected]);

  return {
    isConnected,
    connect,
    disconnect,
    configs,
    isLoading,
    active,
    sliderValues,
    ledStates,
    activeBin,
    isTesting,
    handleControl,
    handleReset,
    handleSliderChange,
    handleLedToggle,
    handleTest,
    handleTestBin,
    handleCenterModule,
    handleSetPosition,
    feederConfig,
    feederSpeedValue,
    feederDurationValue,
    feederPulseDurationValue,
    feederPauseDurationValue,
    handleFeederSpeedChange,
    handleFeederDurationChange,
    handleFeederPulseDurationChange,
    handleFeederPauseDurationChange,
    handleFeederSetSpeed,
    handleFeederSetDuration,
    handleFeederSetPulseDuration,
    handleFeederSetPauseDuration,
    handleFeed,
    isSampleRunning,
    handleSampleRun,
    irStates,
    irMonitoring,
    handleReadIR: readIR,
    handleToggleIrMonitor,
  };
}
