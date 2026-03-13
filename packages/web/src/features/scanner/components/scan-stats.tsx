import { ScrollArea } from "@/components/ui/scroll-area";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import { useMemo, useState } from "react";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function ScanStats() {
  const [expandedSets, setExpandedSets] = useState(false);
  const { cards } = useScannedCards();

  const stats = useMemo(() => computeStats(cards), [cards]);

  if (!stats) {
    return (
      <div className="rounded-lg bg-input/20 dark:bg-input/30 border border-input text-xs font-semibold text-muted-foreground p-2">
        Scan cards to see their stats.
      </div>
    );
  }

  const visibleSets = expandedSets ? stats.sets : stats.sets.slice(0, 5);

  return (
    <ScrollArea className="min-h-0 rounded-lg">
      <div className="flex flex-col gap-2 text-sm">
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
              {expandedSets
                ? "Show less"
                : `Show all ${stats.sets.length} sets`}
            </button>
          )}
        </div>
      </div>
    </ScrollArea>
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
