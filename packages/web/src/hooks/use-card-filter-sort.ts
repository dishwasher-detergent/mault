import { RARITY_ORDER, type ScannedCard } from "@magic-vault/shared";
import { useMemo, useState } from "react";

export function useCardFilterSort(cards: ScannedCard[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>("scan-desc");

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let result = cards;

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
  }, [cards, searchQuery, sortKey]);

  return { filteredAndSorted, searchQuery, setSearchQuery, sortKey, setSortKey };
}
