import { Button } from "@/components/ui/button";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import type { CardFilters } from "@/features/cards/types";
import { cn } from "@/lib/utils";
import { BIN_COUNT } from "@magic-vault/shared";
import { IconFilter } from "@tabler/icons-react";

const EMPTY_FILTERS: CardFilters = { colors: [], rarities: [], bins: [] };

const COLORS = ["W", "U", "B", "R", "G", "C"] as const;
const RARITIES = ["common", "uncommon", "rare", "mythic"] as const;

const COLOR_ACTIVE: Record<string, string> = {
  W: "bg-amber-100 text-amber-900 border-amber-400",
  U: "bg-blue-500 text-white border-blue-700",
  B: "bg-neutral-900 text-white border-neutral-700",
  R: "bg-red-500 text-white border-red-700",
  G: "bg-green-600 text-white border-green-800",
  C: "bg-gray-400 text-white border-gray-500",
};

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

const chipBase =
  "cursor-pointer border transition-colors rounded text-xs font-bold";
const chipInactive =
  "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground";

interface CardFilterPopoverProps {
  activeFilters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
  activeFilterCount: number;
}

export function CardFilterPopover({
  activeFilters,
  onFiltersChange,
  activeFilterCount,
}: CardFilterPopoverProps) {
  const bins = Array.from({ length: BIN_COUNT }, (_, i) => i + 1);

  return (
    <DynamicPopover
      trigger={
        <Button
          variant={activeFilterCount > 0 ? "secondary" : "outline"}
          size="icon"
          className="shrink-0"
        >
          <IconFilter className="size-4" />
        </Button>
      }
      side="bottom"
      align="end"
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 font-heading">
            Color
          </p>
          <div className="flex gap-1">
            {COLORS.map((color) => {
              const active = activeFilters.colors.includes(color);
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    onFiltersChange({
                      ...activeFilters,
                      colors: toggle(activeFilters.colors, color),
                    })
                  }
                  className={cn(
                    chipBase,
                    "size-7",
                    active ? COLOR_ACTIVE[color] : chipInactive,
                  )}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 font-heading">
            Rarity
          </p>
          <div className="flex flex-col gap-1">
            {RARITIES.map((rarity) => {
              const active = activeFilters.rarities.includes(rarity);
              return (
                <button
                  key={rarity}
                  type="button"
                  onClick={() =>
                    onFiltersChange({
                      ...activeFilters,
                      rarities: toggle(activeFilters.rarities, rarity),
                    })
                  }
                  className={cn(
                    chipBase,
                    "flex items-center gap-1.5 px-2 h-7 font-medium",
                    active
                      ? "border-transparent text-background"
                      : chipInactive,
                  )}
                  style={
                    active ? { backgroundColor: `var(--${rarity})` } : undefined
                  }
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: `var(--${rarity})` }}
                  />
                  <span className="capitalize">{rarity}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 font-heading">
            Bin
          </p>
          <div className="flex gap-1 flex-wrap">
            {bins.map((bin) => {
              const active = activeFilters.bins.includes(bin);
              return (
                <button
                  key={bin}
                  type="button"
                  onClick={() =>
                    onFiltersChange({
                      ...activeFilters,
                      bins: toggle(activeFilters.bins, bin),
                    })
                  }
                  className={cn(
                    chipBase,
                    "size-7",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : chipInactive,
                  )}
                >
                  {bin}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() =>
                onFiltersChange({
                  ...activeFilters,
                  bins: toggle(activeFilters.bins, null),
                })
              }
              className={cn(
                chipBase,
                "size-7",
                activeFilters.bins.includes(null)
                  ? "bg-muted-foreground text-background border-muted-foreground"
                  : chipInactive,
              )}
              title="Unassigned"
            >
              —
            </button>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onFiltersChange(EMPTY_FILTERS)}
          >
            Reset filters
          </Button>
        )}
      </div>
    </DynamicPopover>
  );
}
