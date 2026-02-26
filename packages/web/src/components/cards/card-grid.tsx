import { CardToolbar } from "@/components/cards/card-toolbar";
import { ScannedCardItem } from "@/components/cards/scanned-card-item";
import { useCardFilterSort } from "@/hooks/use-card-filter-sort";
import { useScannedCards } from "@/hooks/use-scanned-cards";
import { exportToManabox } from "@/lib/export-manabox";
import { useCallback } from "react";

export function CardGrid() {
  const { cards, removeCard, clearCards } = useScannedCards();
  const {
    filteredAndSorted,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
  } = useCardFilterSort(cards);

  const handleExport = useCallback(() => {
    exportToManabox(cards);
  }, [cards]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm font-medium">No cards scanned yet</p>
        <p className="text-xs">Scan a card to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-sidebar/80 backdrop-blur-2xl p-2">
        <CardToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onExport={handleExport}
          onClearAll={clearCards}
          hasCards={filteredAndSorted.length > 0}
        />
      </div>
      {filteredAndSorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm font-medium">No cards match the search query</p>
          <p className="text-xs">Try adjusting your search or sort options</p>
        </div>
      )}
      <div className="grid grid-cols-2 @sm:grid-cols-3 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 @2xl:grid-cols-6 gap-2 p-2 pt-0">
        {filteredAndSorted.map((card) => (
          <ScannedCardItem
            key={card.scanId}
            card={card.card}
            scanId={card.scanId}
            onRemove={() => removeCard(card.scanId)}
            binNumber={card.binNumber}
          />
        ))}
      </div>
    </>
  );
}
