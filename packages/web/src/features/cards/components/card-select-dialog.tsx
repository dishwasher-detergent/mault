import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "@/features/cards/api/scryfall";
import type { CardSelectDialogProps } from "@/features/cards/types";
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
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconExternalLink,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function formatManaCost(manaCost: string): string {
  return manaCost.replace(/[{}]/g, " ").trim().replace(/\s+/g, " ");
}

function formatPrice(label: string, value: string | null): string | null {
  return value ? `${label}: $${value}` : null;
}

export function CardSelectDialog({
  trigger,
  title = "Select Card",
  description = "Search Scryfall for a card.",
  scanId,
  onRemove,
  currentCard,
  alternativeMatches,
  capturedImageUrl,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: CardSelectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [editing, setEditing] = useState(!currentCard);
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [selectedSet, setSelectedSet] = useState<string | null>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Stable candidates list — built once per scanId, not rebuilt on correction
  const [candidates, setCandidates] = useState<ScryfallCardWithDistance[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const prevScanIdRef = useRef<string | undefined>(undefined);

  const { addCard, correctCard } = useScannedCards();

  // Rebuild candidates when navigating to a different scan entry
  useEffect(() => {
    if (!open || !currentCard) return;
    if (scanId !== prevScanIdRef.current) {
      prevScanIdRef.current = scanId;
      const ids = new Set<string>();
      const all: ScryfallCardWithDistance[] = [];
      for (const c of [currentCard, ...(alternativeMatches ?? [])]) {
        if (!ids.has(c.id)) { ids.add(c.id); all.push(c); }
      }
      setCandidates(all);
      setSelectedId(currentCard.id);
      setEditing(false);
    }
  }, [open, scanId, currentCard, alternativeMatches]);

  // Keyboard navigation
  useEffect(() => {
    if (!open || editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, editing, hasPrev, hasNext, onPrev, onNext]);

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

  // Used by the Scryfall search picker — corrects and closes
  const handleSelect = useCallback(
    (card: ScryfallCard) => {
      if (scanId) {
        correctCard(scanId, card);
      } else {
        addCard({ ...card, distance: 0 });
      }
      handleOpenChange(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scanId, addCard, correctCard],
  );

  // Used by the candidates picker — corrects but stays open
  const handleSelectCandidate = useCallback(
    (card: ScryfallCardWithDistance) => {
      setSelectedId(card.id);
      if (scanId) correctCard(scanId, card);
    },
    [scanId, correctCard],
  );

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isControlled) setInternalOpen(isOpen);
      controlledOnOpenChange?.(isOpen);
      if (!isOpen) {
        setQuery("");
        setDebouncedQuery("");
        setSelectedSet("all");
        setEditing(!currentCard);
        prevScanIdRef.current = undefined;
        setCandidates([]);
        setSelectedId(undefined);
      }
    },
    [isControlled, controlledOnOpenChange, currentCard],
  );

  const handleRemove = useCallback(() => {
    onRemove?.();
    handleOpenChange(false);
  }, [onRemove, handleOpenChange]);

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

  const selectedCard = candidates.find((c) => c.id === selectedId) ?? currentCard;
  const hasMultipleCandidates = candidates.length > 1;

  const prices = selectedCard
    ? [
        formatPrice("USD", selectedCard.prices.usd),
        formatPrice("Foil", selectedCard.prices.usd_foil),
        formatPrice("EUR", selectedCard.prices.eur),
      ].filter(Boolean)
    : [];

  const dialogTitle = selectedCard && !editing ? getCardFaceName(selectedCard) : title;
  const dialogDescription =
    selectedCard && !editing ? selectedCard.type_line : description;

  const hasNav = onPrev !== undefined || onNext !== undefined;

  return (
    <>
      <DynamicDialog
        trigger={trigger}
        title={dialogTitle}
        description={dialogDescription}
        open={open}
        onOpenChange={handleOpenChange}
        className="sm:max-w-lg max-h-[85vh] flex flex-col gap-2"
        footerClassName="flex-col-reverse"
        footer={
          currentCard && !editing ? (
            <>
              <Button variant="destructive" onClick={handleRemove}>
                <IconTrash className="size-4" />
                Remove
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(true);
                  if (selectedCard) handleInputChange(getCardFaceName(selectedCard));
                }}
              >
                <IconPencil className="size-4" />
                Correct Card
              </Button>
            </>
          ) : undefined
        }
      >
        {currentCard && !editing ? (
          <div className="flex flex-col gap-4 overflow-y-auto">

            {/* ── Candidates picker (only when multiple close matches) ── */}
            {hasMultipleCandidates && (
              <div className="flex flex-col gap-2">
                {capturedImageUrl && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-12 aspect-[2.5/3.5] rounded overflow-hidden border shrink-0">
                      <img
                        src={capturedImageUrl}
                        alt="Scanned"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Your scanned card — select the correct version below
                    </p>
                  </div>
                )}
                {!capturedImageUrl && (
                  <p className="text-xs text-muted-foreground font-medium">
                    Multiple close matches — select the correct version:
                  </p>
                )}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {candidates.map((c) => {
                    const isSelected = c.id === selectedId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCandidate(c)}
                        className={cn(
                          "shrink-0 flex flex-col gap-1 items-center cursor-pointer group",
                        )}
                      >
                        <div
                          className={cn(
                            "w-28 aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 transition-all",
                            isSelected
                              ? "border-primary shadow-md"
                              : "border-border group-hover:border-primary/60",
                          )}
                        >
                          <img
                            src={getCardImageUris(c)?.normal || getCardImageUris(c)?.small || ""}
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
                              "text-[10px] font-medium",
                              isSelected ? "text-primary" : "text-muted-foreground",
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

            {/* ── Card detail view ── */}
            <div className={cn("flex gap-3", hasMultipleCandidates && "pt-0")}>
              {/* Image (only shown when no picker, since picker already shows it) */}
              {!hasMultipleCandidates && (
                <div className="shrink-0 flex flex-col gap-2 items-center">
                  <div className="w-28 aspect-[2.5/3.5] rounded-lg overflow-hidden border">
                    <img
                      src={(selectedCard ? getCardImageUris(selectedCard) : undefined)?.normal || ""}
                      alt={selectedCard?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {capturedImageUrl && (
                    <>
                      <p className="text-[10px] text-muted-foreground">Scanned</p>
                      <div className="w-28 aspect-[2.5/3.5] rounded-lg overflow-hidden border">
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

              {/* Text info */}
              {selectedCard && (() => {
                const face = selectedCard.card_faces?.[0];
                const manaCost = selectedCard.mana_cost ?? face?.mana_cost;
                const oracleText = selectedCard.oracle_text ?? face?.oracle_text;
                const power = selectedCard.power ?? face?.power;
                const toughness = selectedCard.toughness ?? face?.toughness;
                const artist = selectedCard.artist ?? face?.artist;
                return (
                <div className="flex flex-col gap-1.5 min-w-0 text-xs flex-1">
                  {manaCost && (
                    <p className="text-muted-foreground">
                      Mana: {formatManaCost(manaCost)}
                    </p>
                  )}
                  {oracleText && (
                    <p className="whitespace-pre-line leading-relaxed">
                      {oracleText}
                    </p>
                  )}
                  {power != null && toughness != null && (
                    <p className="font-semibold">
                      {power}/{toughness}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-muted-foreground flex-wrap">
                    <div
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: `var(--${selectedCard.rarity})` }}
                    />
                    <span className="capitalize">{selectedCard.rarity}</span>
                    <span>·</span>
                    <span>
                      {selectedCard.set_name} #{selectedCard.collector_number}
                    </span>
                  </div>
                  {prices.length > 0 && (
                    <p className="text-muted-foreground">{prices.join(" · ")}</p>
                  )}
                  {artist && <p className="text-muted-foreground">Art by {artist}</p>}
                  <a
                    href={selectedCard.scryfall_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline w-fit"
                  >
                    View on Scryfall
                    <IconExternalLink className="h-3 w-3" />
                  </a>
                </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input
                  placeholder="Search by card name..."
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="pl-7"
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
                <div className="grid grid-cols-3 gap-1">
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
          </>
        )}
      </DynamicDialog>
      {open &&
        hasNav &&
        !editing &&
        createPortal(
          <div className="fixed inset-0 pointer-events-none flex items-center justify-between px-4 z-[60]">
            <Button
              size="icon"
              onClick={onPrev}
              disabled={!hasPrev}
              className="pointer-events-auto"
            >
              <IconChevronLeft className="size-5" />
            </Button>
            <Button
              size="icon"
              onClick={onNext}
              disabled={!hasNext}
              className="pointer-events-auto"
            >
              <IconChevronRight className="size-5" />
            </Button>
          </div>,
          document.body,
        )}
    </>
  );
}
