import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardFilterSort } from "@/features/cards/api/use-card-filter-sort";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { SessionSummaryDialog } from "@/features/cards/components/session-summary-dialog";
import { getCollectionViewers } from "@/features/collections/api/collections";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useScannerIsland } from "@/features/scanner/api/use-scanner-island";
import { ScannerControls } from "@/features/scanner/components/scanner-controls";
import { ScannerDebug } from "@/features/scanner/components/scanner-debug";

import { IconFolders } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export function CardGrid() {
  const {
    activeCollection,
    deleteCollection,
    isLoading: collectionsLoading,
  } = useCollections();
  const { cards, removeCard, removeCards, clearCards, isLoading, elapsedMs } =
    useScannedCards();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const scanner = useScannerIsland();
  const { locks, currentUserId } = useCollectionLocks();
  const isScanningActive = !!(
    activeCollection && locks[activeCollection.guid]?.userId === currentUserId
  );
  const { data: viewersRaw } = useQuery({
    queryKey: ["collection-viewers", activeCollection?.guid],
    queryFn: () => getCollectionViewers(activeCollection!.guid),
    enabled: isScanningActive,
    refetchInterval: 5000,
  });
  const viewers = viewersRaw?.filter((v) => v.userId !== currentUserId);
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
  }, [removeCards, selectedIds]);

  const handleClearSession = useCallback(async () => {
    if (activeCollection) {
      await deleteCollection(activeCollection.guid);
    } else {
      clearCards();
    }
  }, [activeCollection, deleteCollection, clearCards]);

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
      <>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm font-medium">No cards scanned yet</p>
          <p className="text-xs">Scan a card to get started</p>
        </div>
        {scanner?.isCameraActive && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border ring-2 ring-sidebar/70 dark:ring-border/50 backdrop-blur-xl shadow-xl p-2 bg-sidebar/50">
            {scanner?.isCameraActive && (
              <>
                <ScannerControls
                  status={scanner.status}
                  onForceAddDuplicate={scanner.handleForceAddDuplicate}
                  onForceScan={scanner.handleForceScan}
                  onPause={scanner.handlePause}
                  onResume={scanner.handleResume}
                />
                {scanner.isConnected && (
                  <Button
                    onClick={scanner.handleFeed}
                    disabled={!scanner.isReady || scanner.isFeeding}
                  >
                    {scanner.isFeeding ? "Feeding…" : "Feed"}
                  </Button>
                )}
                <ScannerDebug />
              </>
            )}
          </div>
        )}
      </>
    );
  }

  if (openEntry) {
    return (
      <CardDetailPanel
        scanId={openEntry.scanId}
        currentCard={openEntry.card}
        alternativeMatches={openEntry.alternativeMatches}
        capturedImageUrl={openEntry.capturedImageUrl}
        onClose={() => setOpenScanId(null)}
        onRemove={() => {
          removeCard(openEntry.scanId);
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
        currentIndex={openIndex}
        total={filteredAndSorted.length}
      />
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl p-2 border-b">
        <CardToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onExport={() => setSummaryOpen(true)}
          collectionName={activeCollection?.name}
          onClearAll={() => setSummaryOpen(true)}
          hasCards={filteredAndSorted.length > 0}
          activeFilters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
          watchers={viewers}
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
              hasAlternatives={!!card.alternativeMatches?.length}
            />
          ))}
        </AnimatePresence>
      </div>

      {(scanner?.isCameraActive || selectedIds.size > 0) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border ring-2 ring-foreground/20 backdrop-blur-xl shadow-xl p-2 bg-sidebar/70">
          {scanner?.isCameraActive && (
            <>
              <ScannerControls
                status={scanner.status}
                onForceAddDuplicate={scanner.handleForceAddDuplicate}
                onForceScan={scanner.handleForceScan}
                onPause={scanner.handlePause}
                onResume={scanner.handleResume}
              />
              {scanner.isConnected && (
                <Button
                  onClick={scanner.handleFeed}
                  disabled={!scanner.isReady || scanner.isFeeding}
                >
                  {scanner.isFeeding ? "Feeding…" : "Feed"}
                </Button>
              )}
              <ScannerDebug />
            </>
          )}
          {selectedIds.size > 0 && (
            <>
              {scanner?.isCameraActive && (
                <div className="w-px h-5 bg-border mx-1 shrink-0" />
              )}
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} {selectedIds.size === 1 ? "card" : "cards"}{" "}
                selected
              </span>
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      )}

      <SessionSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        cards={cards}
        elapsedMs={elapsedMs}
        collectionName={activeCollection?.name ?? "collection"}
        onClear={handleClearSession}
      />

      <DeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? "card" : "cards"}?`}
        description={`This will permanently remove the selected ${selectedIds.size === 1 ? "card" : "cards"} from your collection. This action cannot be undone.`}
        confirm={{ type: "keyword" }}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
