import { formatUsd } from "@/features/scanner/components/scan-stats";
import type { ScanStats } from "@/features/scanner/lib/compute-stats";

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

interface SessionStatsPanelProps {
  stats: ScanStats | null;
  totalCards: number;
}

export function SessionStatsPanel({
  stats,
  totalCards,
}: SessionStatsPanelProps) {
  return (
    <>
      <div className="rounded-lg border bg-input/20 dark:bg-input/30">
        <div className="grid grid-cols-2 divide-x divide-y divide-border">
          <div className="col-span-2 divide-y divide-border">
            <StatCell label="Total Cards" value={String(totalCards)} />
          </div>
          <StatCell
            label="Unique"
            value={stats ? String(stats.uniqueCount) : "-"}
          />
          <StatCell
            label="Value"
            value={stats ? formatUsd(stats.totalValue) : "-"}
          />
        </div>
        {stats?.mostValuable && (
          <div className="p-2 border-t border-input">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              Most Valuable
            </p>
            <p className="text-xs font-semibold truncate">
              {stats.mostValuable.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatUsd(stats.mostValuable.price)}
            </p>
          </div>
        )}
      </div>

      {stats && stats.rarities.length > 0 && (
        <div className="rounded-lg border bg-input/20 dark:bg-input/30 p-2">
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
      )}
    </>
  );
}
