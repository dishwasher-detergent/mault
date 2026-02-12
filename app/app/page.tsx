"use client";

import { CardGrid } from "@/components/card-grid";
import { CardScanner } from "@/components/card-scanner";
import { CardSelectDialog } from "@/components/card-select-dialog";
import { CardToolbar } from "@/components/card-toolbar";
import { ScanStats } from "@/components/scan-stats";
import { useCardFilterSort } from "@/hooks/use-card-filter-sort";
import { useScannedCards } from "@/hooks/use-scanned-cards";
import type {
  ScryfallCard,
  ScryfallCardWithDistance,
} from "@/interfaces/scryfall.interface";
import { exportToManabox } from "@/lib/export-manabox";
import { useCallback, useRef, useState } from "react";

export default function App() {
  const {
    cards: scannedCards,
    addCard,
    removeCard,
    correctCard,
    clearCards,
  } = useScannedCards();
  const { filteredAndSorted, searchQuery, setSearchQuery, sortKey, setSortKey } =
    useCardFilterSort(scannedCards);
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLElement>(null);

  const handleNewScan = (matches: ScryfallCardWithDistance[]) => {
    if (matches.length > 0) {
      addCard(matches[0]);
    }
  };

  const handleManualAddSelect = (card: ScryfallCard) => {
    addCard({ ...card, distance: 0 });
    setManualAddOpen(false);
  };

  const handleExport = useCallback(() => {
    exportToManabox(scannedCards);
  }, [scannedCards]);

  return (
    <>
      <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
        <section className="col-span-3 border-r flex flex-col overflow-hidden p-2">
          <CardScanner
            onSearchResults={handleNewScan}
            onManualAdd={() => setManualAddOpen(true)}
            className="shrink-0 mb-2"
          />
          <div className="flex-1 overflow-y-auto min-h-0">
            <ScanStats cards={scannedCards} />
          </div>
        </section>
        <section
          ref={scrollContainerRef}
          className="col-span-9 overflow-y-auto h-full"
        >
          <CardToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortKey={sortKey}
            onSortChange={setSortKey}
            onExport={handleExport}
            onClearAll={clearCards}
            hasCards={scannedCards.length > 0}
          />
          <div className="p-2">
            <CardGrid
              cards={filteredAndSorted}
              onRemoveCard={removeCard}
              onCorrectCard={correctCard}
            />
          </div>
        </section>
      </div>
      <CardSelectDialog
        open={manualAddOpen}
        onOpenChange={setManualAddOpen}
        currentCardName=""
        onSelect={handleManualAddSelect}
        title="Add Card Manually"
        description="Search Scryfall to find and add a card to your collection."
      />
    </>
  );
}
