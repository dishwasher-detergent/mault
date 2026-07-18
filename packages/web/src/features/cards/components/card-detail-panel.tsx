import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BinLocationDiagram } from "@/features/bins/components/bin-location-diagram";
import { Search } from "@/features/cards/api/scryfall";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { cn } from "@/lib/utils";
import {
  getCardFaceName,
  getCardImageUris,
  QUERY_MIN_LENGTH,
  type ScryfallCard,
  type ScryfallCardWithDistance,
} from "@magic-vault/shared";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function formatManaCost(manaCost: string): string {
  return manaCost.replace(/[{}]/g, " ").trim().replace(/\s+/g, " ");
}

function formatPrice(label: string, value: string | null): string | null {
  return value ? `${label}: $${value}` : null;
}

interface CardDetailPanelProps {
  scanId?: string;
  onClose: () => void;
  onRemove?: () => void;
  currentCard?: ScryfallCardWithDistance;
  alternativeMatches?: ScryfallCardWithDistance[];
  capturedImageUrl?: string;
  isFoil?: boolean;
  binNumber?: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  total?: number;
}

export function CardDetailPanel({
  scanId,
  onClose,
  onRemove,
  currentCard,
  alternativeMatches,
  capturedImageUrl,
  isFoil = false,
  binNumber,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  total,
}: CardDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<string | null>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [candidates, setCandidates] = useState<ScryfallCardWithDistance[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const prevScanIdRef = useRef<string | undefined>(undefined);

  const { addCard, correctCard, toggleFoil } = useScannedCards();

  useEffect(() => {
    if (!currentCard) return;
    if (scanId !== prevScanIdRef.current) {
      prevScanIdRef.current = scanId;
      const ids = new Set<string>();
      const all: ScryfallCardWithDistance[] = [];
      for (const c of [currentCard, ...(alternativeMatches ?? [])]) {
        if (!ids.has(c.id)) {
          ids.add(c.id);
          all.push(c);
        }
      }
      setCandidates(all);
      setSelectedId(currentCard.id);
      setEditing(false);
      setQuery("");
      setDebouncedQuery("");
      setSelectedSet("all");
    }
  }, [scanId, currentCard, alternativeMatches]);

  useEffect(() => {
    if (editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editing, hasPrev, hasNext, onPrev, onNext, onClose]);

  const isQueryReady = debouncedQuery.trim().length >= QUERY_MIN_LENGTH;

  const { data: results = [], isFetching: loading } = useQuery({
    queryKey: ["scryfall", "search", debouncedQuery],
    queryFn: () => Search(debouncedQuery).then((r) => r.data ?? []),
    enabled: isQueryReady,
    staleTime: 60_000,
  });

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedSet("all");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 300);
  };

  const handleSelect = useCallback(
    (card: ScryfallCard) => {
      if (scanId) correctCard(scanId, card);
      else addCard({ ...card, distance: 0 });
      onClose();
    },
    [scanId, addCard, correctCard, onClose],
  );

  const handleSelectCandidate = useCallback(
    (card: ScryfallCardWithDistance) => {
      setSelectedId(card.id);
      if (scanId) correctCard(scanId, card);
    },
    [scanId, correctCard],
  );

  const sets = useMemo(() => {
    const setMap = new Map<string, string>();
    for (const card of results) {
      if (!setMap.has(card.set)) setMap.set(card.set, card.set_name);
    }
    return Array.from(setMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  const filteredResults = useMemo(() => {
    if (selectedSet === "all") return results;
    return results.filter((card) => card.set === selectedSet);
  }, [results, selectedSet]);

  const selectedCard =
    candidates.find((c) => c.id === selectedId) ?? currentCard;
  const hasMultipleCandidates = candidates.length > 1;

  const prices = selectedCard
    ? [
        formatPrice("USD", selectedCard.prices.usd),
        formatPrice("Foil", selectedCard.prices.usd_foil),
        formatPrice("EUR", selectedCard.prices.eur),
      ].filter(Boolean)
    : [];

  const cardName = selectedCard
    ? getCardFaceName(selectedCard)
    : "Card Details";
  const typeLine = selectedCard?.type_line ?? "";

  return (
    <div className="flex h-full">
      <div className="sticky top-0 p-2 shrink-0 flex flex-col gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 size-7"
          onClick={onClose}
          aria-label="Back to card list"
        >
          <IconX />
        </Button>
        <ButtonGroup orientation="vertical">
          <Button
            size="icon"
            variant="ghost"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Previous card"
          >
            <IconChevronUp />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next card"
          >
            <IconChevronDown />
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex-1 flex flex-col min-w-0 border-l">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl border-b p-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h2 className="font-semibold text-base truncate">{cardName}</h2>
              {total != null && currentIndex != null && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {currentIndex + 1} / {total}
                </span>
              )}
            </div>
            {typeLine && (
              <p className="text-sm text-muted-foreground truncate">
                {typeLine}
              </p>
            )}
          </div>
        </div>
        <div className="p-6 flex flex-col gap-5">
          {currentCard && !editing ? (
            <>
              {hasMultipleCandidates && (
                <div className="flex flex-col gap-3">
                  {capturedImageUrl ? (
                    <div className="flex items-center gap-4">
                      <div className="w-40 aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm shrink-0">
                        <img
                          src={capturedImageUrl}
                          alt="Scanned"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">
                        Your scanned card - select the correct version below
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-medium">
                      Multiple close matches - select the correct version:
                    </p>
                  )}
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {candidates.map((c) => {
                      const isSelected = c.id === selectedId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCandidate(c)}
                          className="shrink-0 flex flex-col gap-1.5 items-center cursor-pointer group"
                        >
                          <div
                            className={cn(
                              "w-32 aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 transition-all",
                              isSelected
                                ? "border-primary shadow-md"
                                : "border-border group-hover:border-primary/60",
                            )}
                          >
                            <img
                              src={
                                getCardImageUris(c)?.normal ||
                                getCardImageUris(c)?.small ||
                                ""
                              }
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            {isSelected && (
                              <IconCheck className="size-3 text-primary shrink-0" />
                            )}
                            <p
                              className={cn(
                                "text-xs font-medium",
                                isSelected
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            >
                              {c.set.toUpperCase()} #{c.collector_number}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t" />
                </div>
              )}
              <div className="flex gap-6">
                {!hasMultipleCandidates && (
                  <div className="shrink-0 flex flex-col gap-3 items-center">
                    <div className="w-44 aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm">
                      <img
                        src={
                          (selectedCard
                            ? getCardImageUris(selectedCard)
                            : undefined
                          )?.normal || ""
                        }
                        alt={selectedCard?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {capturedImageUrl && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Captured scan
                        </p>
                        <div className="w-44 aspect-[2.5/3.5] rounded-lg overflow-hidden border">
                          <img
                            src={capturedImageUrl}
                            alt="Scanned"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedCard &&
                  (() => {
                    const face = selectedCard.card_faces?.[0];
                    const manaCost = selectedCard.mana_cost ?? face?.mana_cost;
                    const oracleText =
                      selectedCard.oracle_text ?? face?.oracle_text;
                    const power = selectedCard.power ?? face?.power;
                    const toughness = selectedCard.toughness ?? face?.toughness;
                    const artist = selectedCard.artist ?? face?.artist;
                    return (
                      <div className="flex flex-col gap-3 min-w-0 flex-1">
                        {manaCost && (
                          <p className="text-sm text-muted-foreground">
                            {formatManaCost(manaCost)}
                          </p>
                        )}
                        {oracleText && (
                          <p className="text-sm whitespace-pre-line leading-relaxed">
                            {oracleText}
                          </p>
                        )}
                        {power != null && toughness != null && (
                          <p className="text-sm font-semibold">
                            {power}/{toughness}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <div
                            className="size-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: `var(--${selectedCard.rarity})`,
                            }}
                          />
                          <span className="capitalize">
                            {selectedCard.rarity}
                          </span>
                          <span>·</span>
                          <span>
                            {selectedCard.set_name} #
                            {selectedCard.collector_number}
                          </span>
                        </div>
                        {binNumber != null && (
                          <div className="flex flex-col gap-1.5">
                            <p className="text-xs font-medium text-muted-foreground">
                              Bin location
                            </p>
                            <div className="w-48 rounded-lg border">
                              <BinLocationDiagram
                                binNumber={binNumber}
                                inverted={false}
                              />
                            </div>
                          </div>
                        )}
                        {prices.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {prices.join(" · ")}
                          </p>
                        )}
                        {artist && (
                          <p className="text-xs text-muted-foreground">
                            Art by {artist}
                          </p>
                        )}
                        <a
                          href={selectedCard.scryfall_uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline w-fit"
                        >
                          View on Scryfall
                          <IconExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    );
                  })()}
              </div>
              <Label className="flex items-center gap-2 w-fit">
                <Switch
                  checked={isFoil}
                  onCheckedChange={(checked) => {
                    if (scanId) toggleFoil(scanId, checked);
                  }}
                  disabled={!scanId}
                />
                Foil
              </Label>
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(true);
                    if (selectedCard)
                      handleInputChange(getCardFaceName(selectedCard));
                  }}
                >
                  <IconPencil className="size-4" />
                  Correct Card
                </Button>
                <Button variant="destructive" onClick={() => onRemove?.()}>
                  <IconTrash className="size-4" />
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <>
              {capturedImageUrl && (
                <div className="flex items-center gap-4">
                  <div className="w-40 aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm shrink-0">
                    <img
                      src={capturedImageUrl}
                      alt="Scanned"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">
                    Your scanned card - search for the correct version below
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <Input
                    placeholder="Search by card name..."
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="pl-7"
                    autoFocus
                  />
                </div>
                {sets.length > 1 && (
                  <Select
                    value={selectedSet}
                    onValueChange={(value) => setSelectedSet(value)}
                  >
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue placeholder="All sets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All sets ({results.length})
                      </SelectItem>
                      {sets.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <ScrollArea className="flex-1 overflow-y-auto min-h-0 max-h-[50vh] border rounded-lg p-1 bg-sidebar">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loading &&
                  filteredResults.length === 0 &&
                  query.trim().length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      Start typing to search for cards
                    </p>
                  )}
                {!loading &&
                  filteredResults.length === 0 &&
                  query.trim().length >= 2 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No cards found
                    </p>
                  )}
                {!loading && filteredResults.length > 0 && (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-1.5">
                    {filteredResults.map((card) => (
                      <Button
                        key={card.id}
                        variant="ghost"
                        className="relative w-full h-auto aspect-[2.5/3.5] p-0 rounded overflow-hidden group"
                        onClick={() => handleSelect(card)}
                      >
                        {getCardImageUris(card)?.small ? (
                          <img
                            src={getCardImageUris(card)!.small}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded shrink-0" />
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] leading-tight px-1 py-0.5 text-center truncate">
                          {card.set.toUpperCase()} #{card.collector_number}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setQuery("");
                  setDebouncedQuery("");
                  setSelectedSet("all");
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
