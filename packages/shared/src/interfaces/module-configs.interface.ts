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

export interface FeederCalibration {
  speed: number;
  duration: number;
  pulseDuration: number;
  pauseDuration: number;
}

export const DEFAULT_FEEDER_CALIBRATION: FeederCalibration = {
  speed: 400,
  duration: 3000,
  pulseDuration: 80,
  pauseDuration: 50,
};
