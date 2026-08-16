import type { ServoConfig } from "./types";

export const SERVOS: ServoConfig[] = [
  {
    name: "bottom",
    labelKey: "servos.bottom.label",
    controlPositions: ["open"],
    defaultPosition: "open",
    calibrationPositions: [
      { labelKey: "servos.bottom.closed", key: "bottomClosed" },
      { labelKey: "servos.bottom.open", key: "bottomOpen" },
    ],
  },
  {
    name: "paddle",
    labelKey: "servos.paddle.label",
    controlPositions: ["open"],
    defaultPosition: "open",
    calibrationPositions: [
      { labelKey: "servos.paddle.closed", key: "paddleClosed" },
      { labelKey: "servos.paddle.open", key: "paddleOpen" },
    ],
  },
  {
    name: "pusher",
    labelKey: "servos.pusher.label",
    controlPositions: ["left", "right"],
    defaultPosition: "neutral",
    calibrationPositions: [
      { labelKey: "servos.pusher.left", key: "pusherLeft" },
      { labelKey: "servos.pusher.neutral", key: "pusherNeutral" },
      { labelKey: "servos.pusher.right", key: "pusherRight" },
    ],
  },
];
