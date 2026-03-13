import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSelectDialog } from "@/features/cards/components/card-select-dialog";
import type { ScannedCardItemProps } from "@/features/cards/types";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { memo } from "react";

export const ScannedCardItem = memo(function ScannedCardItem({
  card,
  scanId,
  onRemove,
  binNumber,
  isSelected = false,
  onToggleSelect,
}: ScannedCardItemProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg p-1 bg-muted border transition-shadow",
        isSelected && "ring-2 ring-primary ring-offset-1",
      )}
      style={{ borderColor: `var(--${card.rarity})` }}
    >
      <CardSelectDialog
        scanId={scanId}
        onRemove={onRemove}
        currentCard={card}
        trigger={
          <button type="button" className="w-full cursor-pointer">
            <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden relative">
              {isSelected && (
                <div className="absolute inset-0 bg-primary/30 z-10 rounded-lg" />
              )}
              <div className="absolute bottom-1 left-1 right-1 flex gap-1 items-center justify-between z-20">
                <Badge
                  variant={card.distance < 0.15 ? "default" : "destructive"}
                >
                  {card.distance != null
                    ? (100 - card.distance * 100).toFixed(2)
                    : "0.00"}
                  %
                </Badge>
                <Badge variant="secondary" className="shadow-md">
                  Bin {binNumber}
                </Badge>
              </div>
              <img
                src={card.image_uris?.normal || ""}
                alt={card.name}
                className="w-full h-full object-cover"
              />
            </div>
          </button>
        }
      />
      {onToggleSelect && (
        <Button
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          variant={isSelected ? "default" : "secondary"}
          className="absolute top-2 right-2 z-30"
        >
          <IconCheck />
        </Button>
      )}
      <div className="flex flex-row justify-between items-center pb-1">
        <div className="px-1 flex flex-row items-center gap-2">
          <div
            className="bg-common size-3 rounded-full"
            style={{ backgroundColor: `var(--${card.rarity})` }}
          />
          <p className="text-xs font-semibold uppercase" title={card.set}>
            {card.set}
          </p>
          <p className="text-xs text-muted-foreground">
            #{card.collector_number}
          </p>
        </div>
      </div>
    </div>
  );
});
