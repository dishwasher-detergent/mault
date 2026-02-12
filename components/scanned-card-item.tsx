import { CardSelectDialog } from "@/components/card-select-dialog";
import { Button } from "@/components/ui/button";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import type { ScryfallCardWithDistance } from "@/interfaces/scryfall.interface";
import { IconExternalLink, IconPencil, IconX } from "@tabler/icons-react";
import { memo } from "react";
import { Badge } from "./ui/badge";
import { ButtonGroup } from "./ui/button-group";

function formatManaCost(manaCost: string): string {
  return manaCost.replace(/[{}]/g, " ").trim().replace(/\s+/g, " ");
}

function formatPrice(label: string, value: string | null): string | null {
  return value ? `${label}: $${value}` : null;
}

interface ScannedCardItemProps {
  card: ScryfallCardWithDistance;
  scanId: string;
  onRemove: () => void;
}

export const ScannedCardItem = memo(function ScannedCardItem({
  card,
  scanId,
  onRemove,
}: ScannedCardItemProps) {
  const prices = [
    formatPrice("USD", card.prices.usd),
    formatPrice("Foil", card.prices.usd_foil),
    formatPrice("EUR", card.prices.eur),
  ].filter(Boolean);

  return (
    <>
      <div
        className="relative rounded-lg p-1 bg-muted border"
        style={{ borderColor: `var(--${card.rarity})` }}
      >
        <DynamicPopover
          trigger={
            <button type="button" className="w-full cursor-pointer">
              <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden relative">
                <img
                  src={card.image_uris?.normal || ""}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
          }
          side="right"
          contentClassName="w-80 gap-2 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-tight">{card.name}</h3>
            {card.mana_cost && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatManaCost(card.mana_cost)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground italic">
            {card.type_line}
          </p>
          {card.oracle_text && (
            <p className="text-xs whitespace-pre-line leading-relaxed">
              {card.oracle_text}
            </p>
          )}
          {card.power != null && card.toughness != null && (
            <p className="text-xs font-semibold text-right">
              {card.power}/{card.toughness}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{card.rarity}</span>
            <span>·</span>
            <span>
              {card.set_name} #{card.collector_number}
            </span>
          </div>
          {prices.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {prices.join(" · ")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Art by {card.artist}</p>
          <a
            href={card.scryfall_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View on Scryfall
            <IconExternalLink className="h-3 w-3" />
          </a>
        </DynamicPopover>
        <div className="absolute bottom-10 left-1 right-1 flex gap-1 items-center justify-between">
          <Badge variant={card.distance < 0.15 ? "default" : "destructive"}>
            {card.distance.toFixed(2)}
          </Badge>
        </div>
        <div className="flex flex-row justify-between items-center">
          <div className="pl-2 flex flex-row items-center gap-2">
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
          <ButtonGroup>
            <CardSelectDialog
              trigger={
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Correct card match"
                >
                  <IconPencil className="h-4 w-4" />
                </Button>
              }
              scanId={scanId}
              title="Correct Card"
              description="Search for the correct card."
            />
            <Button
              size="icon"
              variant="destructive"
              onClick={onRemove}
              aria-label="Remove card"
            >
              <IconX className="h-4 w-4" />
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </>
  );
});
