import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  exportToManabox,
  exportToMoxfield,
  exportToTcgplayer,
} from "@/features/cards/lib/export-formats";
import {
  formatElapsed,
  formatUsd,
} from "@/features/scanner/components/scan-stats";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import type { ScannedCard } from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useMemo, useState } from "react";

interface SessionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: ScannedCard[];
  elapsedMs: number;
  collectionName: string;
  onClear: () => Promise<void>;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

export function SessionSummaryDialog({
  open,
  onOpenChange,
  cards,
  elapsedMs,
  collectionName,
  onClear,
}: SessionSummaryDialogProps) {
  const [isClearing, setIsClearing] = useState(false);
  const stats = useMemo(() => computeStats(cards), [cards]);
  const slug = collectionName.replace(/\s+/g, "-").toLowerCase();

  const cardsPerHour =
    elapsedMs > 0 ? Math.round((cards.length / elapsedMs) * 3_600_000) : null;

  async function handleClear() {
    setIsClearing(true);
    try {
      await onClear();
      onOpenChange(false);
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Session Summary</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border bg-input/20 dark:bg-input/30 divide-y divide-border">
            <div className="grid grid-cols-3 divide-x divide-border">
              <StatCell label="Total Cards" value={String(cards.length)} />
              <StatCell
                label="Unique"
                value={stats ? String(stats.uniqueCount) : "—"}
              />
              <StatCell
                label="Total Value"
                value={stats ? formatUsd(stats.totalValue) : "—"}
              />
            </div>
            <div className="grid grid-cols-3 divide-x divide-border">
              <StatCell
                label="Avg Value"
                value={stats ? formatUsd(stats.avgValue) : "—"}
              />
              <StatCell label="Duration" value={formatElapsed(elapsedMs)} />
              <StatCell
                label="Cards / hr"
                value={cardsPerHour != null ? String(cardsPerHour) : "—"}
              />
            </div>
            {stats?.mostValuable && (
              <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
                  Most Valuable
                </p>
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {stats.mostValuable.name}
                  </p>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {formatUsd(stats.mostValuable.price)}
                  </p>
                </div>
              </div>
            )}
          </div>
          {stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-input/20 dark:bg-input/30 p-2.5">
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
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: `var(--${r.key})` }}
                        />
                        <span>{r.label}</span>
                      </div>
                      <span className="text-muted-foreground">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-input/20 dark:bg-input/30 p-2.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Top Sets
                </p>
                <div className="flex flex-col gap-1">
                  {stats.sets.slice(0, 5).map((s) => (
                    <div
                      key={s.code}
                      className="flex items-center justify-between text-xs gap-1"
                    >
                      <span
                        className="truncate text-muted-foreground"
                        title={s.name}
                      >
                        {s.name}
                      </span>
                      <span className="shrink-0">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Export as
            </p>
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => exportToMoxfield(cards, slug)}
                disabled={cards.length === 0}
              >
                Moxfield
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToTcgplayer(cards, slug)}
                disabled={cards.length === 0}
              >
                TCGPlayer
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToManabox(cards, slug)}
                disabled={cards.length === 0}
              >
                Manabox
              </Button>
            </ButtonGroup>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={isClearing}
            >
              {isClearing && <IconLoader2 className="size-4 animate-spin" />}
              Clear Collection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
