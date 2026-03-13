import { RARITY_LABELS, RARITY_ORDER } from "@/features/scanner/constants";
import type { SetStats } from "@/features/scanner/types";
import type { ScannedCard } from "@magic-vault/shared";

const COLOR_LABELS: Record<string, { label: string; bg: string }> = {
  W: { label: "White", bg: "#F9FAF4" },
  U: { label: "Blue", bg: "#0E68AB" },
  B: { label: "Black", bg: "#150B00" },
  R: { label: "Red", bg: "#D3202A" },
  G: { label: "Green", bg: "#00733E" },
  C: { label: "Colorless", bg: "#94979A" },
};

const COLOR_ORDER = ["W", "U", "B", "R", "G", "C"] as const;

export interface ScanStats {
  totalCount: number;
  uniqueCount: number;
  totalValue: number;
  avgValue: number;
  mostValuable: { name: string; price: number } | null;
  sets: SetStats[];
  rarities: { key: string; label: string; count: number }[];
  colors: { key: string; label: string; bg: string; count: number }[];
}

export function computeStats(cards: ScannedCard[]): ScanStats | null {
  if (cards.length === 0) return null;

  let totalValue = 0;
  let priceableCount = 0;
  const setMap = new Map<string, SetStats>();
  const rarityMap = new Map<string, number>();
  const colorMap = new Map<string, number>();
  let mostValuable: { name: string; price: number } | null = null;
  const uniqueCards = new Set<string>();

  for (const entry of cards) {
    const c = entry.card;
    const price = Number.parseFloat(c.prices?.usd ?? "0");

    uniqueCards.add(c.id);

    if (price > 0) {
      totalValue += price;
      priceableCount++;
    }

    if (price > 0 && (!mostValuable || price > mostValuable.price)) {
      mostValuable = { name: c.name, price };
    }

    const existing = setMap.get(c.set);
    if (existing) {
      existing.count++;
      existing.value += price;
    } else {
      setMap.set(c.set, { code: c.set, name: c.set_name, count: 1, value: price });
    }

    rarityMap.set(c.rarity, (rarityMap.get(c.rarity) ?? 0) + 1);

    const colors = c.color_identity.length > 0 ? c.color_identity : ["C"];
    for (const color of colors) {
      colorMap.set(color, (colorMap.get(color) ?? 0) + 1);
    }
  }

  return {
    totalCount: cards.length,
    uniqueCount: uniqueCards.size,
    totalValue,
    avgValue: priceableCount > 0 ? totalValue / priceableCount : 0,
    mostValuable,
    sets: Array.from(setMap.values()).sort(
      (a, b) => b.value - a.value || b.count - a.count,
    ),
    rarities: RARITY_ORDER.filter((r) => rarityMap.has(r)).map((r) => ({
      key: r,
      label: RARITY_LABELS[r] ?? r,
      count: rarityMap.get(r) ?? 0,
    })),
    colors: COLOR_ORDER.filter((c) => colorMap.has(c)).map((c) => ({
      key: c,
      ...COLOR_LABELS[c],
      count: colorMap.get(c) ?? 0,
    })),
  };
}
