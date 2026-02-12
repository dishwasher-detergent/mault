import type { ScannedCard } from "@/interfaces/scanner.interface";
import type {
  ScryfallCard,
  ScryfallCardWithDistance,
} from "@/interfaces/scryfall.interface";
import {
  clearCards as dbClearCards,
  removeCard as dbRemoveCard,
  updateCard as dbUpdateCard,
  generateScanId,
  getAllCards,
  putCard,
} from "@/lib/card-db";
import { useCallback, useEffect, useState } from "react";

export function useScannedCards() {
  const [cards, setCards] = useState<ScannedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllCards()
      .then((records) => {
        if (!cancelled) {
          setCards(records);
        }
      })
      .catch((err) => {
        console.error("Failed to load cards from IndexedDB:", err);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addCard = useCallback((card: ScryfallCardWithDistance) => {
    const record: ScannedCard = {
      scanId: generateScanId(),
      card,
      scannedAt: Date.now(),
    };
    setCards((prev) => [record, ...prev]);
    putCard(record).catch((err) =>
      console.error("Failed to persist card:", err),
    );
  }, []);

  const removeCard = useCallback((scanId: string) => {
    setCards((prev) => prev.filter((entry) => entry.scanId !== scanId));
    dbRemoveCard(scanId).catch((err) =>
      console.error("Failed to remove card from IndexedDB:", err),
    );
  }, []);

  const correctCard = useCallback((scanId: string, card: ScryfallCard) => {
    const corrected: ScryfallCardWithDistance = { ...card, distance: 0 };
    setCards((prev) =>
      prev.map((entry) =>
        entry.scanId === scanId ? { ...entry, card: corrected } : entry,
      ),
    );
    dbUpdateCard(scanId, corrected).catch((err) =>
      console.error("Failed to update card in IndexedDB:", err),
    );
  }, []);

  const clearCards = useCallback(() => {
    setCards([]);
    dbClearCards().catch((err) =>
      console.error("Failed to clear cards from IndexedDB:", err),
    );
  }, []);

  return { cards, isLoading, addCard, removeCard, correctCard, clearCards };
}
