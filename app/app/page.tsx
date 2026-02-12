"use client";

import { CardCorrectionDialog } from "@/components/card-correction-dialog";
import { CardGrid } from "@/components/card-grid";
import { CardScanner } from "@/components/card-scanner";
import { ScanStats } from "@/components/scan-stats";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RARITY_ORDER } from "@/constants/rarity.constant";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useScannedCards } from "@/hooks/use-scanned-cards";
import {
  ScryfallCard,
  ScryfallCardWithDistance,
} from "@/interfaces/scryfall.interface";
import {
  IconCards,
  IconChartBar,
  IconDownload,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useMemo, useRef, useState } from "react";

export default function App() {
  const {
    cards: scannedCards,
    addCard,
    removeCard,
    correctCard,
    clearCards,
  } = useScannedCards();
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>("scan-desc");
  const [statsDrawerOpen, setStatsDrawerOpen] = useState(false);
  const [cardsDrawerOpen, setCardsDrawerOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const drawerScrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isClearing, setIsClearing] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  const handleClearCards = async () => {
    setIsClearing(true);
    try {
      await clearCards();
    } catch (error) {
      console.error("Failed to clear cards:", error);
    } finally {
      setIsClearing(false);
      setClearAllDialogOpen(false);
    }
  };

  const handleNewScan = (matches: ScryfallCardWithDistance[]) => {
    if (matches.length > 0) {
      addCard(matches[0]);
    }
  };

  const handleManualAddSelect = (card: ScryfallCard) => {
    addCard({ ...card, distance: 0 });
    setManualAddOpen(false);
  };

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let result = scannedCards;

    if (query) {
      result = result.filter((entry) => {
        const c = entry.card;
        return (
          c.name.toLowerCase().includes(query) ||
          c.set_name.toLowerCase().includes(query) ||
          c.set.toLowerCase().includes(query) ||
          c.type_line.toLowerCase().includes(query) ||
          c.collector_number.toLowerCase().includes(query) ||
          (c.oracle_text?.toLowerCase().includes(query) ?? false)
        );
      });
    }

    if (sortKey === "scan-desc") return result;

    const sorted = [...result];
    const [field, dir] = sortKey?.split("-") as [string, "asc" | "desc"];
    const mul = dir === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      const ca = a.card;
      const cb = b.card;
      switch (field) {
        case "name":
          return mul * ca.name.localeCompare(cb.name);
        case "set":
          return mul * ca.set_name.localeCompare(cb.set_name);
        case "rarity":
          return (
            mul *
            ((RARITY_ORDER[ca.rarity] ?? 0) - (RARITY_ORDER[cb.rarity] ?? 0))
          );
        case "price": {
          const pa = Number.parseFloat(ca.prices.usd ?? "0");
          const pb = Number.parseFloat(cb.prices.usd ?? "0");
          return mul * (pa - pb);
        }
        case "cmc":
          return mul * (ca.cmc - cb.cmc);
        case "edhrec":
          return (
            mul *
            ((ca.edhrec_rank ?? Number.MAX_SAFE_INTEGER) -
              (cb.edhrec_rank ?? Number.MAX_SAFE_INTEGER))
          );
        default:
          return 0;
      }
    });

    return sorted;
  }, [scannedCards, searchQuery, sortKey]);

  const exportToManabox = useCallback(() => {
    if (scannedCards.length === 0) return;

    const grouped = new Map<
      string,
      { card: ScryfallCardWithDistance; quantity: number }
    >();
    for (const entry of scannedCards) {
      const existing = grouped.get(entry.card.id);
      if (existing) {
        existing.quantity++;
      } else {
        grouped.set(entry.card.id, { card: entry.card, quantity: 1 });
      }
    }

    const csvEscape = (val: string) =>
      val.includes(",") || val.includes('"')
        ? `"${val.replace(/"/g, '""')}"`
        : val;

    const headers = [
      "Name",
      "Set code",
      "Set name",
      "Collector number",
      "Foil",
      "Quantity",
      "Scryfall ID",
      "Condition",
      "Language",
      "Purchase price",
    ];

    const rows = Array.from(grouped.values()).map(({ card, quantity }) => [
      csvEscape(card.name),
      card.set.toUpperCase(),
      csvEscape(card.set_name),
      card.collector_number,
      card.foil ? "foil" : "",
      String(quantity),
      card.id,
      "Near Mint",
      card.lang,
      card.prices.usd ?? "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mtg-vault-manabox-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scannedCards]);

  const sortSelect = (
    <Select value={sortKey} onValueChange={(value) => setSortKey(value)}>
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="scan-desc">Scan Order</SelectItem>
        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
        <SelectItem value="set-asc">Set (A-Z)</SelectItem>
        <SelectItem value="set-desc">Set (Z-A)</SelectItem>
        <SelectItem value="rarity-asc">Rarity (Low-High)</SelectItem>
        <SelectItem value="rarity-desc">Rarity (High-Low)</SelectItem>
        <SelectItem value="price-asc">Price (Low-High)</SelectItem>
        <SelectItem value="price-desc">Price (High-Low)</SelectItem>
        <SelectItem value="cmc-asc">Mana Value (Low-High)</SelectItem>
        <SelectItem value="cmc-desc">Mana Value (High-Low)</SelectItem>
        <SelectItem value="edhrec-asc">Rank (Best First)</SelectItem>
        <SelectItem value="edhrec-desc">Rank (Worst First)</SelectItem>
      </SelectContent>
    </Select>
  );

  if (isMobile) {
    return (
      <>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CardScanner
            onSearchResults={handleNewScan}
            onManualAdd={() => setManualAddOpen(true)}
            className="flex-1 min-h-0"
          />
          <nav className="h-14 border-t bg-background flex flex-row items-center justify-around shrink-0">
            <Button
              variant="ghost"
              className="flex flex-col items-center gap-0.5 h-12"
              onClick={() => setCardsDrawerOpen(true)}
            >
              <IconCards className="size-5" />
              <span className="text-xs">
                Cards{scannedCards.length > 0 && ` (${scannedCards.length})`}
              </span>
            </Button>
            <Button
              variant="ghost"
              className="flex flex-col items-center gap-0.5 h-12"
              onClick={() => setStatsDrawerOpen(true)}
            >
              <IconChartBar className="size-5" />
              <span className="text-xs">Stats</span>
            </Button>
            <Button
              variant="ghost"
              className="flex flex-col items-center gap-0.5 h-12"
              onClick={exportToManabox}
              disabled={scannedCards.length === 0}
            >
              <IconDownload className="size-5" />
              <span className="text-xs">Export</span>
            </Button>
          </nav>
        </div>

        <Drawer open={cardsDrawerOpen} onOpenChange={setCardsDrawerOpen}>
          <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>
                Cards{scannedCards.length > 0 && ` (${scannedCards.length})`}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-row gap-2 items-center px-4 pb-2">
              <Input
                placeholder="Search by name, set, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {sortSelect}
            </div>
            <div
              ref={drawerScrollRef}
              className="overflow-y-auto flex-1 min-h-0 px-4 pb-4"
            >
              <CardGrid
                cards={filteredAndSorted}
                onRemoveCard={removeCard}
                onCorrectCard={correctCard}
              />
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={statsDrawerOpen} onOpenChange={setStatsDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Stats</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 min-h-0 pb-4">
              <ScanStats cards={scannedCards} />
            </div>
          </DrawerContent>
        </Drawer>

        <CardCorrectionDialog
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

  return (
    <>
      <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
        <section className="col-span-3 border-r bg-sidebar flex flex-col overflow-hidden p-2">
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
          <div className="flex flex-row gap-2 items-center w-full sticky top-0 z-10 bg-background p-2 border-b">
            <Input
              placeholder="Search by name, set, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {sortSelect}
            <Button
              variant="secondary"
              size="icon"
              onClick={exportToManabox}
              disabled={scannedCards.length === 0}
              className="shrink-0"
            >
              <IconDownload className="size-4" />
            </Button>
            <AlertDialog
              open={clearAllDialogOpen}
              onOpenChange={setClearAllDialogOpen}
            >
              <AlertDialogTrigger
                render={
                  <Button
                    variant="secondary"
                    size="icon"
                    title="Clear all cards"
                  >
                    <IconTrash className="size-4" />
                  </Button>
                }
              ></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all scanned cards?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all cards from your collection.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearCards}
                    disabled={isClearing}
                  >
                    {isClearing ? "Clearing..." : "Clear All"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="p-2">
            <CardGrid
              cards={filteredAndSorted}
              onRemoveCard={removeCard}
              onCorrectCard={correctCard}
            />
          </div>
        </section>
      </div>
      <CardCorrectionDialog
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
