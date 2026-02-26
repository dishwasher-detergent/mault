import { QUERY_MIN_LENGTH, type ScryfallCard, type ScryfallCardWithDistance } from "@magic-vault/shared";
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
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { Search } from "../api/scryfall";
import {
  IconExternalLink,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useMemo, useRef, useState } from "react";

function formatManaCost(manaCost: string): string {
  return manaCost.replace(/[{}]/g, " ").trim().replace(/\s+/g, " ");
}

function formatPrice(label: string, value: string | null): string | null {
  return value ? `${label}: $${value}` : null;
}

interface CardSelectDialogProps {
  trigger: React.ReactElement;
  title?: string;
  description?: string;
  scanId?: string;
  onRemove?: () => void;
  currentCard?: ScryfallCardWithDistance;
}

export function CardSelectDialog({
  trigger,
  title = "Select Card",
  description = "Search Scryfall for a card.",
  scanId,
  onRemove,
  currentCard,
}: CardSelectDialogProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(!currentCard);
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSet, setSelectedSet] = useState<string | null>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const { addCard, correctCard } = useScannedCards();
  const search = useCallback(async (q: string) => {
    if (q.trim().length < QUERY_MIN_LENGTH) {
      setResults([]);
      return;
    }

    setLoading(true);
    const response = await Search(q);
    setResults(response.data ?? []);
    setLoading(false);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedSet("all");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = useCallback(
    (card: ScryfallCard) => {
      if (scanId) {
        correctCard(scanId, card);
      } else {
        addCard({ ...card, distance: 0 });
      }
      setOpen(false);
    },
    [scanId, addCard, correctCard],
  );

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        setQuery("");
        setResults([]);
        setSelectedSet("all");
        setEditing(!currentCard);
      }
    },
    [currentCard],
  );

  const handleRemove = useCallback(() => {
    onRemove?.();
    setOpen(false);
  }, [onRemove]);

  const sets = useMemo(() => {
    const setMap = new Map<string, string>();
    for (const card of results) {
      if (!setMap.has(card.set)) {
        setMap.set(card.set, card.set_name);
      }
    }
    return Array.from(setMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  const filteredResults = useMemo(() => {
    if (selectedSet === "all") return results;
    return results.filter((card) => card.set === selectedSet);
  }, [results, selectedSet]);

  const prices = currentCard
    ? [
        formatPrice("USD", currentCard.prices.usd),
        formatPrice("Foil", currentCard.prices.usd_foil),
        formatPrice("EUR", currentCard.prices.eur),
      ].filter(Boolean)
    : [];

  const dialogTitle = currentCard && !editing ? currentCard.name : title;
  const dialogDescription =
    currentCard && !editing ? currentCard.type_line : description;

  return (
    <DynamicDialog
      trigger={trigger}
      title={dialogTitle}
      description={dialogDescription}
      open={open}
      onOpenChange={handleOpenChange}
      className="sm:max-w-lg max-h-[80vh] flex flex-col gap-2"
      footerClassName="flex-col-reverse"
      footer={
        currentCard && !editing ? (
          <>
            <Button variant="destructive" onClick={handleRemove}>
              <IconTrash className="size-4" />
              Remove
            </Button>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <IconPencil className="size-4" />
              Correct Card
            </Button>
          </>
        ) : undefined
      }
    >
      {currentCard && !editing ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <div className="w-28 shrink-0 aspect-[2.5/3.5] rounded-lg overflow-hidden border">
              <img
                src={currentCard.image_uris?.normal || ""}
                alt={currentCard.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              {currentCard.mana_cost && (
                <p className="text-xs text-muted-foreground">
                  Mana: {formatManaCost(currentCard.mana_cost)}
                </p>
              )}
              {currentCard.oracle_text && (
                <p className="text-xs whitespace-pre-line leading-relaxed">
                  {currentCard.oracle_text}
                </p>
              )}
              {currentCard.power != null && currentCard.toughness != null && (
                <p className="text-xs font-semibold">
                  {currentCard.power}/{currentCard.toughness}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{currentCard.rarity}</span>
                <span>·</span>
                <span>
                  {currentCard.set_name} #{currentCard.collector_number}
                </span>
              </div>
              {prices.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {prices.join(" · ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Art by {currentCard.artist}
              </p>
              <a
                href={currentCard.scryfall_uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View on Scryfall
                <IconExternalLink className="h-3 w-3" />
              </a>
            </div>
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
                    className="w-full h-auto aspect-[2.5/3.5] p-0 rounded overflow-hidden"
                    onClick={() => handleSelect(card)}
                  >
                    {card.image_uris?.small ? (
                      <img
                        src={card.image_uris.small}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-muted rounded shrink-0" />
                    )}
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </DynamicDialog>
  );
}
