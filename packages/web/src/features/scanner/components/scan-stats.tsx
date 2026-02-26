import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { RARITY_LABELS, RARITY_ORDER } from "@/features/scanner/constants";
import type { SetStats } from "@/features/scanner/types";
import { useMemo, useState } from "react";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function ScanStats() {
  const [expandedSets, setExpandedSets] = useState(false);
  const { cards } = useScannedCards();

  const stats = useMemo(() => {
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
        setMap.set(c.set, {
          code: c.set,
          name: c.set_name,
          count: 1,
          value: price,
        });
      }

      rarityMap.set(c.rarity, (rarityMap.get(c.rarity) ?? 0) + 1);

      for (const color of c.color_identity) {
        colorMap.set(color, (colorMap.get(color) ?? 0) + 1);
      }
      if (c.color_identity.length === 0) {
        colorMap.set("C", (colorMap.get("C") ?? 0) + 1);
      }
    }

    const sets = Array.from(setMap.values()).sort(
      (a, b) => b.value - a.value || b.count - a.count,
    );

    const rarities = RARITY_ORDER.filter((r) => rarityMap.has(r)).map((r) => ({
      key: r,
      label: RARITY_LABELS[r] ?? r,
      count: rarityMap.get(r) ?? 0,
    }));

    const COLOR_LABELS: Record<string, { label: string; bg: string }> = {
      W: { label: "White", bg: "#F9FAF4" },
      U: { label: "Blue", bg: "#0E68AB" },
      B: { label: "Black", bg: "#150B00" },
      R: { label: "Red", bg: "#D3202A" },
      G: { label: "Green", bg: "#00733E" },
      C: { label: "Colorless", bg: "#94979A" },
    };

    const colors = ["W", "U", "B", "R", "G", "C"]
      .filter((c) => colorMap.has(c))
      .map((c) => ({
        key: c,
        ...COLOR_LABELS[c],
        count: colorMap.get(c) ?? 0,
      }));

    return {
      totalCount: cards.length,
      uniqueCount: uniqueCards.size,
      totalValue,
      priceableCount,
      avgValue: priceableCount > 0 ? totalValue / priceableCount : 0,
      mostValuable,
      sets,
      rarities,
      colors,
    };
  }, [cards]);

  if (!stats) {
    return null;
  }

  const visibleSets = expandedSets ? stats.sets : stats.sets.slice(0, 5);

  return (
    <div className="flex flex-col gap-2 text-sm overflow-y-auto mt-2">
      <div className="rounded-lg bg-input/20 dark:bg-input/30 border border-input">
        <div className="grid grid-cols-2">
          <StatCard
            label="Total Cards"
            value={String(stats.totalCount)}
            className="border-r border-b border-input"
          />
          <StatCard
            label="Unique"
            value={String(stats.uniqueCount)}
            className="border-b border-input"
          />
          <StatCard
            label="Total Value"
            value={formatUsd(stats.totalValue)}
            className="border-r border-input"
          />
          <StatCard label="Avg Value" value={formatUsd(stats.avgValue)} />
        </div>
        {stats.mostValuable && (
          <div className="p-2 border-t border-input">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Most Valuable
            </p>
            <div className="flex flex-row justify-between items-center">
              <p className="text-xs font-semibold truncate">
                {stats.mostValuable.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatUsd(stats.mostValuable.price)}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-lg bg-input/20 dark:bg-input/30 border border-input p-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          By Rarity
        </p>
        <div className="flex flex-col gap-1">
          {stats.rarities.map((r) => (
            <div
              key={r.key}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: `var(--${r.key})` }}
                />
                <span>{r.label}</span>
              </div>
              <span className="text-muted-foreground">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg bg-input/20 dark:bg-input/30 border border-input p-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          By Color
        </p>
        <div className="flex flex-col gap-1">
          {stats.colors.map((c) => (
            <div
              key={c.key}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="size-2.5 rounded-full border border-border"
                  style={{ backgroundColor: c.bg }}
                />
                <span>{c.label}</span>
              </div>
              <span className="text-muted-foreground">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg bg-input/20 dark:bg-input/30 border border-input p-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          By Set
        </p>
        <div className="flex flex-col gap-1">
          {visibleSets.map((s) => (
            <div
              key={s.code}
              className="flex items-center justify-between text-xs gap-2"
            >
              <span className="truncate" title={s.name}>
                {s.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">{s.count}</span>
                <span className="text-muted-foreground w-14 text-right">
                  {formatUsd(s.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {stats.sets.length > 5 && (
          <button
            type="button"
            className="text-xs text-primary hover:underline mt-1"
            onClick={() => setExpandedSets((prev) => !prev)}
          >
            {expandedSets ? "Show less" : `Show all ${stats.sets.length} sets`}
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`p-2 ${className ?? ""}`}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
