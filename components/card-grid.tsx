import { ScannedCardItem } from "@/components/scanned-card-item";
import type { ScannedCard } from "@/interfaces/scanner.interface";
import type { ScryfallCard } from "@/interfaces/scryfall.interface";
import { useRef } from "react";

interface CardGridProps {
  cards: ScannedCard[];
  onRemoveCard: (scanId: string) => void;
  onCorrectCard?: (scanId: string, card: ScryfallCard) => void;
}

export function CardGrid({
  cards,
  onRemoveCard,
  onCorrectCard,
}: CardGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  if (cards.length === 0) {
    return (
      <div
        ref={gridRef}
        className="flex flex-col items-center justify-center py-16 text-muted-foreground"
      >
        <p className="text-sm font-medium">No cards scanned yet</p>
        <p className="text-xs">Scan a card to get started</p>
      </div>
    );
  }

  return (
    <div ref={gridRef} className="flex w-full flex-row">
      {cards.map((card, rowIndex) => (
        <ScannedCardItem
          card={card.card}
          onRemove={() => onRemoveCard(card.scanId)}
          onCorrect={
            onCorrectCard ? (x) => onCorrectCard(card.scanId, x) : undefined
          }
        />
      ))}
    </div>
  );
}
