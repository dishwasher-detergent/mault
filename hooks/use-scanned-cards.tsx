"use client";

import type { ScannedCard } from "@/interfaces/scanner.interface";
import type {
  ScryfallCard,
  ScryfallCardWithDistance,
} from "@/interfaces/scryfall.interface";
import type { BinConfig } from "@/interfaces/sort-bins.interface";
import {
  clearCards as dbClearCards,
  removeCard as dbRemoveCard,
  updateCard as dbUpdateCard,
  generateScanId,
  getAllCards,
  putCard,
} from "@/lib/card-db";
import { loadBinConfigs } from "@/lib/db/sort-bins";
import { evaluateCardBin } from "@/lib/evaluate-bin";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ScannedCardsContextValue {
  cards: ScannedCard[];
  isLoading: boolean;
  addCard: (card: ScryfallCardWithDistance) => void;
  removeCard: (scanId: string) => void;
  correctCard: (scanId: string, card: ScryfallCard) => void;
  clearCards: () => void;
}

const ScannedCardsContext = createContext<ScannedCardsContextValue | null>(
  null,
);

export function ScannedCardsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cards, setCards] = useState<ScannedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const binConfigsRef = useRef<BinConfig[]>([]);

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

    loadBinConfigs().then((result) => {
      if (!cancelled && result.success && result.data) {
        binConfigsRef.current = result.data;
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const addCard = useCallback((card: ScryfallCardWithDistance) => {
    const matchedBin = evaluateCardBin(card, binConfigsRef.current);
    const record: ScannedCard = {
      scanId: generateScanId(),
      card,
      scannedAt: Date.now(),
      binNumber: matchedBin?.binNumber,
      binLabel: matchedBin?.label || undefined,
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

  return (
    <ScannedCardsContext
      value={{ cards, isLoading, addCard, removeCard, correctCard, clearCards }}
    >
      {children}
    </ScannedCardsContext>
  );
}

export function useScannedCards() {
  const context = useContext(ScannedCardsContext);
  if (!context) {
    throw new Error(
      "useScannedCards must be used within a ScannedCardsProvider",
    );
  }
  return context;
}
