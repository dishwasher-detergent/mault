import { MODULES } from "@/features/calibration/constants";
import type { SliderKey } from "@/features/calibration/types";
import type { ServoCalibration } from "@magic-vault/shared";

export function getCalibrationKey(
  servo: "bottom" | "paddle" | "pusher",
  position: string,
): keyof ServoCalibration | null {
  if (servo === "bottom")
    return position === "open" ? "bottomOpen" : "bottomClosed";
  if (servo === "paddle")
    return position === "open" ? "paddleOpen" : "paddleClosed";
  if (servo === "pusher") {
    if (position === "left") return "pusherLeft";
    if (position === "right") return "pusherRight";
    return "pusherNeutral";
  }
  return null;
}

export function defaultSliderValues(): Record<SliderKey, number> {
  const vals = {} as Record<SliderKey, number>;
  for (const m of MODULES) {
    vals[`${m}:bottom`] = 307;
    vals[`${m}:paddle`] = 307;
    vals[`${m}:pusher`] = 307;
  }
  return vals;
}
