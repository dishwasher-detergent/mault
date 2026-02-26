import type { ServoConfig } from "./types";

export const MODULES = [1, 2, 3] as const;

export const SERVOS: ServoConfig[] = [
  {
    name: "bottom",
    label: "Bottom Paddle",
    controlPositions: ["open"],
    defaultPosition: "open",
    calibrationPositions: [
      { label: "Set Closed", key: "bottomClosed" },
      { label: "Set Open", key: "bottomOpen" },
    ],
  },
  {
    name: "paddle",
    label: "Paddles",
    controlPositions: ["open"],
    defaultPosition: "open",
    calibrationPositions: [
      { label: "Set Closed", key: "paddleClosed" },
      { label: "Set Open", key: "paddleOpen" },
    ],
  },
  {
    name: "pusher",
    label: "Pusher",
    controlPositions: ["left", "right"],
    defaultPosition: "neutral",
    calibrationPositions: [
      { label: "Set Left", key: "pusherLeft" },
      { label: "Set Neutral", key: "pusherNeutral" },
      { label: "Set Right", key: "pusherRight" },
    ],
  },
];
