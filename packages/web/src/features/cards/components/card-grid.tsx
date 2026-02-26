import { Skeleton } from "@/components/ui/skeleton";
import { useCardFilterSort } from "@/features/cards/api/use-card-filter-sort";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { exportToManabox } from "@/features/cards/lib/export-manabox";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useCallback } from "react";

export function CardGrid() {
  const { cards, removeCard, clearCards, isLoading } = useScannedCards();
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 @sm:grid-cols-3 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 @2xl:grid-cols-6 gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg p-1 bg-muted border border-border">
            <Skeleton className="aspect-[2.5/3.5] rounded-lg" />
            <div className="flex items-center gap-2 px-1 py-1">
              <Skeleton className="size-3 rounded-full shrink-0" />
              <Skeleton className="h-3 w-8 rounded" />
              <Skeleton className="h-3 w-6 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

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
