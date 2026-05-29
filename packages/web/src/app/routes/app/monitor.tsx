import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useCardFilterSort } from "@/features/cards/api/use-card-filter-sort";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useSessionMonitor } from "@/features/scanner/api/use-session-monitor";
import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { SessionStatsPanel } from "@/features/scanner/components/session-stats-panel";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import { IconArrowLeft, IconLoader2, IconWifiOff } from "@tabler/icons-react";
import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

export default function MonitorPage() {
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const { collection, cards, viewers, errors, status } =
    useSessionMonitor(collectionGuid);
  const { locks, currentUserId } = useCollectionLocks();
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

  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <aside className="col-span-5 md:col-span-5 lg:col-span-4 xl:col-span-3 2xl:col-span-2 overflow-hidden flex flex-col h-full p-2 border-r gap-2 bg-sidebar">
        <div className="flex items-center gap-2 px-1 pt-1 min-w-0">
          <Link
            to="/app/monitor"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <IconArrowLeft size={16} />
          </Link>
          <h1 className="text-sm font-semibold truncate">
            {collection?.name ?? "Session Monitor"}
          </h1>
        </div>
        {(isScanning || otherViewers.length > 0) && (
          <div className="flex items-center gap-1 px-1 flex-wrap">
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
        {status === "connecting" && cards.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <IconLoader2 size={16} className="animate-spin" />
            Loading session…
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center justify-center h-full text-destructive text-sm gap-2">
            <IconWifiOff size={16} />
            Could not connect to session. Make sure you're logged in as an org
            member.
          </div>
        )}
        {status === "connected" && cards.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No cards scanned yet.
          </div>
        )}
        {status === "connected" &&
          cards.length > 0 &&
          filteredAndSorted.length === 0 && (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
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
      </main>
    </div>
  );
}
