import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  exportToCardKingdom,
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
import { IconChevronDown, IconDownload } from "@tabler/icons-react";
import { useMemo, useState } from "react";

const EXPORT_FORMATS = {
  manabox: { label: "Manabox", fn: exportToManabox },
  moxfield: { label: "Moxfield", fn: exportToMoxfield },
  tcgplayer: { label: "TCGPlayer", fn: exportToTcgplayer },
  cardkingdom: { label: "Card Kingdom Buylist", fn: exportToCardKingdom },
} as const;

type ExportFormat = keyof typeof EXPORT_FORMATS;

interface SessionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: ScannedCard[];
  elapsedMs: number;
  collectionName: string;
  onMarkDownloaded: (scanIds: string[]) => void;
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
  onMarkDownloaded,
}: SessionSummaryDialogProps) {
  const [includeDownloaded, setIncludeDownloaded] = useState(false);
  const previouslyDownloadedCount = useMemo(
    () => cards.filter((c) => c.isDownloaded).length,
    [cards],
  );
  const exportCards = useMemo(
    () => (includeDownloaded ? cards : cards.filter((c) => !c.isDownloaded)),
    [cards, includeDownloaded],
  );
  const stats = useMemo(() => computeStats(cards), [cards]);
  const slug = collectionName.replace(/\s+/g, "-").toLowerCase();

  const cardsPerHour =
    elapsedMs > 0 ? Math.round((cards.length / elapsedMs) * 3_600_000) : null;

  function handleDownload(format: ExportFormat) {
    EXPORT_FORMATS[format].fn(exportCards, slug);
    onMarkDownloaded(exportCards.map((c) => c.scanId));
    onOpenChange(false);
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
          {previouslyDownloadedCount > 0 && (
            <label className="flex items-center justify-between gap-1.5 text-xs text-muted-foreground">
              Include previously downloaded
              <Switch
                size="sm"
                checked={includeDownloaded}
                onCheckedChange={setIncludeDownloaded}
              />
            </label>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button disabled={exportCards.length === 0} />}
              >
                <IconDownload className="size-4" />
                Download ({exportCards.length})
                <IconChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(EXPORT_FORMATS).map(([key, { label }]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleDownload(key as ExportFormat)}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
