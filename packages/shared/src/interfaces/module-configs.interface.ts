export interface ServoCalibration {
  bottomClosed: number;
  bottomOpen: number;
  paddleClosed: number;
  paddleOpen: number;
  pusherLeft: number;
  pusherNeutral: number;
  pusherRight: number;
}

export interface ModuleConfig {
  moduleNumber: 1 | 2 | 3;
  calibration: ServoCalibration;
}

export const DEFAULT_CALIBRATION: ServoCalibration = {
  bottomClosed: 150,
  bottomOpen: 307,
  paddleClosed: 150,
  paddleOpen: 307,
  pusherLeft: 150,
  pusherNeutral: 307,
  pusherRight: 460,
};
