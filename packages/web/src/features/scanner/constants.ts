import type { ScannerStatus } from "@magic-vault/shared";

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
