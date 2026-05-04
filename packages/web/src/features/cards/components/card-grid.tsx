import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardFilterSort } from "@/features/cards/api/use-card-filter-sort";
import { CardSelectDialog } from "@/features/cards/components/card-select-dialog";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { exportToManabox } from "@/features/cards/lib/export-manabox";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";

import { IconFolders } from "@tabler/icons-react";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export function CardGrid() {
  const {
    activeCollection,
    deleteCollection,
    isLoading: collectionsLoading,
  } = useCollections();
  const { cards, removeCard, removeCards, clearCards, isLoading } =
    useScannedCards();
  const {
    filteredAndSorted,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    filters,
    setFilters,
    activeFilterCount,
  } = useCardFilterSort(cards);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newestScanId, setNewestScanId] = useState<string | null>(null);
  const [openScanId, setOpenScanId] = useState<string | null>(null);
  const prevCardCountRef = useRef(cards.length);

  useEffect(() => {
    if (cards.length > prevCardCountRef.current && cards.length > 0) {
      setNewestScanId(cards[0].scanId);
      const timer = setTimeout(() => setNewestScanId(null), 1200);
      prevCardCountRef.current = cards.length;
      return () => clearTimeout(timer);
    }
    prevCardCountRef.current = cards.length;
  }, [cards]);

  const openIndex = openScanId
    ? filteredAndSorted.findIndex((c) => c.scanId === openScanId)
    : -1;
  const openEntry = openIndex >= 0 ? filteredAndSorted[openIndex] : null;

  const toggleSelect = useCallback((scanId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) next.delete(scanId);
      else next.add(scanId);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    removeCards(Array.from(selectedIds));
    setSelectedIds(new Set());
    setConfirmOpen(false);
  }, [removeCards, selectedIds]);

  const handleExport = useCallback(() => {
    exportToManabox(cards);
  }, [cards]);

  const handleExportAndDelete = useCallback(async () => {
    if (activeCollection) {
      await deleteCollection(activeCollection.guid);
    }
  }, [activeCollection, deleteCollection]);

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

  if (!collectionsLoading && !activeCollection) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <IconFolders className="size-10" />
        <div className="text-center">
          <p className="text-sm font-medium">No collection selected</p>
          <p className="text-xs">
            Create or select a collection to start scanning
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link to="/app/collections">Manage Collections</Link>}
        ></Button>
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
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl p-4 border-b">
        <CardToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onExport={handleExport}
          onExportAndDelete={
            activeCollection ? handleExportAndDelete : undefined
          }
          collectionName={activeCollection?.name}
          onClearAll={clearCards}
          hasCards={filteredAndSorted.length > 0}
          activeFilters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
        />
      </div>
      {filteredAndSorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm font-medium">No cards match the search query</p>
          <p className="text-xs">Try adjusting your search or sort options</p>
        </div>
      )}
      <div className="grid grid-cols-3 @md:grid-cols-4 @4xl:grid-cols-6 @5xl:grid-cols-8 gap-2 p-4">
        <AnimatePresence initial={false}>
          {filteredAndSorted.map((card) => (
            <ScannedCardItem
              key={card.scanId}
              card={card.card}
              onOpen={() => setOpenScanId(card.scanId)}
              binNumber={card.binNumber}
              isSelected={selectedIds.has(card.scanId)}
              onToggleSelect={() => toggleSelect(card.scanId)}
              isNew={card.scanId === newestScanId}
            />
          ))}
        </AnimatePresence>
      </div>

      <CardSelectDialog
        open={openEntry !== null}
        onOpenChange={(isOpen) => !isOpen && setOpenScanId(null)}
        currentCard={openEntry?.card}
        scanId={openEntry?.scanId}
        onRemove={() => {
          if (openEntry) removeCard(openEntry.scanId);
          setOpenScanId(null);
        }}
        onPrev={() =>
          setOpenScanId(filteredAndSorted[openIndex - 1]?.scanId ?? null)
        }
        onNext={() =>
          setOpenScanId(filteredAndSorted[openIndex + 1]?.scanId ?? null)
        }
        hasPrev={openIndex > 0}
        hasNext={openIndex < filteredAndSorted.length - 1}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border backdrop-blur-sm shadow-lg p-2 bg-sidebar">
          <span className="text-sm">
            {selectedIds.size} {selectedIds.size === 1 ? "card" : "cards"}{" "}
            selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            Delete
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "card" : "cards"}?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the selected{" "}
              {selectedIds.size === 1 ? "card" : "cards"} from your collection.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
