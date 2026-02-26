import { Badge } from "@/components/ui/badge";
import { CardSelectDialog } from "@/features/cards/components/card-select-dialog";
import type { ScannedCardItemProps } from "@/features/cards/types";
import { memo } from "react";

export const ScannedCardItem = memo(function ScannedCardItem({
  card,
  scanId,
  onRemove,
  binNumber,
}: ScannedCardItemProps) {
  return (
    <div
      className="relative rounded-lg p-1 bg-muted border"
      style={{ borderColor: `var(--${card.rarity})` }}
    >
      <CardSelectDialog
        scanId={scanId}
        onRemove={onRemove}
        currentCard={card}
        trigger={
          <button type="button" className="w-full cursor-pointer">
            <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden relative">
              <div className="absolute bottom-1 left-1 right-1 flex gap-1 items-center justify-between">
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
