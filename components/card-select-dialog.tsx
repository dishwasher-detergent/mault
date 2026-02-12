import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QUERY_MIN_LENGTH } from "@/constants/scryfall.constant";
import { useScannedCards } from "@/hooks/use-scanned-cards";
import type { ScryfallCard } from "@/interfaces/scryfall.interface";
import { Search } from "@/lib/scryfall/search";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";

interface CardSelectDialogProps {
  trigger: React.ReactElement;
  title?: string;
  description?: string;
  scanId?: string;
}

export function CardSelectDialog({
  trigger,
  title = "Select Card",
  description = "Search Scryfall for a card.",
  scanId,
}: CardSelectDialogProps) {
  const [open, setOpen] = useState(false);
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

    console.log(response);
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

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelectedSet("all");
    }
  }, []);

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

  return (
    <DynamicDialog
      trigger={trigger}
      title={title}
      description={description}
      open={open}
      onOpenChange={handleOpenChange}
      className="sm:max-w-lg max-h-[80vh] flex flex-col"
    >
      <div className="flex gap-2 px-4 md:px-0">
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
              <SelectItem value="all">All sets ({results.length})</SelectItem>
              {sets.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <ScrollArea className="flex-1 overflow-y-auto min-h-0 max-h-[50vh] border rounded-lg p-1 bg-sidebar mx-4 mb-4 md:mx-0 md:mb-0">
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
    </DynamicDialog>
  );
}
