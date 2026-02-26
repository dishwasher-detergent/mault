import type { ScannerStatus } from "@magic-vault/shared";

export const STABILITY_FRAMES = 5;
export const DETECTION_INTERVAL_MS = 100;
export const SCANNABLE_STATUSES: ScannerStatus[] = [
  "scanning",
  "no-match",
  "duplicate",
];

export const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic",
  special: "Special",
  bonus: "Bonus",
};

export const RARITY_ORDER = [
  "mythic",
  "rare",
  "uncommon",
  "common",
  "special",
  "bonus",
];

export const MTG_ASPECT_RATIO = 2.5 / 3.5;

export const OPENCV_CDN_URL = "https://docs.opencv.org/4.10.0/opencv.js";
