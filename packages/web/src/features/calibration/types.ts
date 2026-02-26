import type { ModuleConfig, ServoCalibration } from "@magic-vault/shared";

export interface ModuleConfigsContextValue {
  configs: ModuleConfig[];
  saveConfig: (
    moduleNumber: 1 | 2 | 3,
    calibration: ServoCalibration,
  ) => Promise<void>;
  moveServo: (
    module: 1 | 2 | 3,
    servo: "bottom" | "paddle" | "pusher",
    value: number,
  ) => void;
}

export interface ServoConfig {
  name: "bottom" | "paddle" | "pusher";
  label: string;
  controlPositions: string[];
  defaultPosition: string;
  calibrationPositions: { label: string; key: keyof ServoCalibration }[];
}

export type SliderKey = `${1 | 2 | 3}:${"bottom" | "paddle" | "pusher"}`;

export type ActivePositions = Record<string, string | null>;
