import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useCardFilterSort } from "@/features/cards/api/use-card-filter-sort";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useSessionMonitor } from "@/features/scanner/api/use-session-monitor";
import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { SessionStatsPanel } from "@/features/scanner/components/session-stats-panel";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { IconCards, IconLoader2, IconWifiOff } from "@tabler/icons-react";
import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

function CardGrid({
  filteredAndSorted,
  newestScanId,
  status,
  cardCount,
}: {
  filteredAndSorted: ReturnType<typeof useCardFilterSort>["filteredAndSorted"];
  newestScanId: string | null;
  status: string;
  cardCount: number;
}) {
  return (
    <>
      {status === "connecting" && cardCount === 0 && (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm gap-2">
          <IconLoader2 size={16} className="animate-spin" />
          Loading session…
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center justify-center h-32 text-destructive text-sm gap-2">
          <IconWifiOff size={16} />
          Could not connect.
        </div>
      )}
      {status === "connected" && cardCount === 0 && (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No cards scanned yet.
        </div>
      )}
      {status === "connected" &&
        cardCount > 0 &&
        filteredAndSorted.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No cards match the search query.
          </div>
        )}
      <AnimatePresence initial={false}>
        <div className="grid grid-cols-3 @md:grid-cols-4 @4xl:grid-cols-6 @5xl:grid-cols-8 gap-2 p-4">
          {filteredAndSorted.map((card) => (
            <ScannedCardItem
              key={card.scanId}
              card={card.card}
              binNumber={card.binNumber}
              isNew={card.scanId === newestScanId}
              onOpen={() => {}}
            />
          ))}
        </div>
      </AnimatePresence>
    </>
  );
}

export default function MonitorPage() {
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const { collection, cards, viewers, errors, status } =
    useSessionMonitor(collectionGuid);
  const { locks, currentUserId } = useCollectionLocks();
  const isMobile = useIsMobile();

  const isScanning = !!(collectionGuid && locks[collectionGuid]);
  const scannerUserId = collectionGuid
    ? locks[collectionGuid]?.userId
    : undefined;
  const otherViewers = viewers.filter(
    (v) => v.userId !== scannerUserId && v.userId !== currentUserId,
  );
  const stats = useMemo(() => computeStats(cards), [cards]);
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

  const [newestScanId, setNewestScanId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstCardId = cards[0]?.scanId ?? null;

  useEffect(() => {
    if (!firstCardId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setNewestScanId(firstCardId);
    timerRef.current = setTimeout(() => setNewestScanId(null), 1200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [firstCardId]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewerAvatars = (
    <>
      {isScanning && collectionGuid && locks[collectionGuid] && (
        <InitialsAvatar
          name={locks[collectionGuid].displayName}
          variant="scanner"
          tooltip={`${locks[collectionGuid].displayName} is scanning`}
        />
      )}
      {otherViewers.map((v) => (
        <InitialsAvatar
          key={v.userId}
          name={v.displayName}
          variant="neutral"
          tooltip={`${v.displayName} is watching`}
        />
      ))}
    </>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {(isScanning || otherViewers.length > 0) && (
          <div className="flex items-center gap-1">{viewerAvatars}</div>
        )}

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <SessionStatsPanel stats={stats} totalCards={cards.length} />
          <SessionErrorsPanel errors={errors} />
        </div>

        <Drawer>
          <DrawerTrigger className="flex items-center justify-center gap-2 mx-3 mb-3 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
            <IconCards className="size-4" />
            {cards.length > 0
              ? `View ${cards.length} card${cards.length === 1 ? "" : "s"}`
              : "View Cards"}
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerTitle className="sr-only">Scanned Cards</DrawerTitle>
            <div className="flex flex-col overflow-hidden flex-1 min-h-0 pt-2">
              <div className="px-2 pb-2 border-b @container">
                <CardToolbar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  sortKey={sortKey}
                  onSortChange={setSortKey}
                  hasCards={filteredAndSorted.length > 0}
                  activeFilters={filters}
                  onFiltersChange={setFilters}
                  activeFilterCount={activeFilterCount}
                />
              </div>
              <div className="overflow-y-auto flex-1 @container">
                <CardGrid
                  filteredAndSorted={filteredAndSorted}
                  newestScanId={newestScanId}
                  status={status}
                  cardCount={cards.length}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <aside className="col-span-5 md:col-span-5 lg:col-span-4 xl:col-span-3 2xl:col-span-2 overflow-hidden flex flex-col h-full p-2 border-r gap-2 bg-sidebar">
        {(isScanning || otherViewers.length > 0) && (
          <div className="flex items-center gap-1 px-1 flex-wrap">
            {viewerAvatars}
          </div>
        )}
        <SessionStatsPanel stats={stats} totalCards={cards.length} />
        <SessionErrorsPanel errors={errors} />
      </aside>

      <main className="col-span-7 md:col-span-7 lg:col-span-8 xl:col-span-9 2xl:col-span-10 overflow-y-auto h-full @container">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl p-2 border-b">
          <CardToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortKey={sortKey}
            onSortChange={setSortKey}
            hasCards={filteredAndSorted.length > 0}
            activeFilters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
          />
        </div>
        <CardGrid
          filteredAndSorted={filteredAndSorted}
          newestScanId={newestScanId}
          status={status}
          cardCount={cards.length}
        />
      </main>
    </div>
  );
}
