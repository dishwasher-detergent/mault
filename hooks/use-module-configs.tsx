"use client";

import { useSerial } from "@/hooks/use-serial";
import {
  DEFAULT_CALIBRATION,
  ModuleConfig,
  ServoCalibration,
} from "@/interfaces/module-configs.interface";
import {
  getModuleConfigs,
  saveModuleConfig,
} from "@/lib/actions/module-configs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ModuleConfigsContextValue {
  configs: ModuleConfig[];
  saveConfig: (moduleNumber: 1 | 2 | 3, calibration: ServoCalibration) => Promise<void>;
  moveServo: (module: 1 | 2 | 3, servo: "bottom" | "paddle" | "pusher", value: number) => void;
}

const ModuleConfigsContext = createContext<ModuleConfigsContextValue | null>(null);

function defaultConfigs(): ModuleConfig[] {
  return ([1, 2, 3] as const).map((n) => ({
    moduleNumber: n,
    calibration: { ...DEFAULT_CALIBRATION },
  }));
}

export function ModuleConfigsProvider({ children }: { children: React.ReactNode }) {
  const { isReady, sendCommand } = useSerial();
  const [configs, setConfigs] = useState<ModuleConfig[]>(defaultConfigs);
  const configsRef = useRef(configs);
  configsRef.current = configs;

  useEffect(() => {
    let cancelled = false;
    getModuleConfigs().then((result) => {
      if (!cancelled && result.success && result.data) {
        setConfigs(result.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    (async () => {
      for (const config of configsRef.current) {
        await sendCommand(
          JSON.stringify({
            setConfig: { module: config.moduleNumber, ...config.calibration },
          }),
        );
      }
    })();
  }, [isReady, sendCommand]);

  const saveConfig = useCallback(
    async (moduleNumber: 1 | 2 | 3, calibration: ServoCalibration) => {
      setConfigs((prev) =>
        prev.map((c) => (c.moduleNumber === moduleNumber ? { ...c, calibration } : c)),
      );

      const result = await saveModuleConfig(moduleNumber, calibration);
      if (result.success && result.data) {
        setConfigs(result.data);
        sendCommand(
          JSON.stringify({ setConfig: { module: moduleNumber, ...calibration } }),
        );
      }
    },
    [sendCommand],
  );

  const moveServo = useCallback(
    (module: 1 | 2 | 3, servo: "bottom" | "paddle" | "pusher", value: number) => {
      sendCommand(JSON.stringify({ servo, module, value }));
    },
    [sendCommand],
  );

  return (
    <ModuleConfigsContext value={{ configs, saveConfig, moveServo }}>
      {children}
    </ModuleConfigsContext>
  );
}

export function useModuleConfigs() {
  const context = useContext(ModuleConfigsContext);
  if (!context) {
    throw new Error("useModuleConfigs must be used within a ModuleConfigsProvider");
  }
  return context;
}
