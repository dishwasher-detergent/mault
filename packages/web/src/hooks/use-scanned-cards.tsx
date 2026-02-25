import { type ScannedCard, type ScryfallCard, type ScryfallCardWithDistance, evaluateCardBin, getCatchAllBin } from "@magic-vault/shared";

import { useBinConfigs } from "@/hooks/use-bin-configs";
import { useSerial } from "@/hooks/use-serial";
import {
  clearCards as dbClearCards,
  removeCard as dbRemoveCard,
  updateCard as dbUpdateCard,
  generateScanId,
  getAllCards,
  putCard,
} from "@/lib/idb";
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
  sendCatchAllBin: () => void;
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
  const { configs: binConfigs } = useBinConfigs();
  const { sendBin, isConnected } = useSerial();
  const binConfigsRef = useRef(binConfigs);
  const serialRef = useRef({ sendBin, isConnected });

  useEffect(() => {
    binConfigsRef.current = binConfigs;
  }, [binConfigs]);

  useEffect(() => {
    serialRef.current = { sendBin, isConnected };
  }, [sendBin, isConnected]);

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
    const matchedBin = evaluateCardBin(card, binConfigsRef.current);
    const record: ScannedCard = {
      scanId: generateScanId(),
      card,
      scannedAt: Date.now(),
      binNumber: matchedBin?.binNumber,
    };
    setCards((prev) => [record, ...prev]);
    putCard(record).catch((err) =>
      console.error("Failed to persist card:", err),
    );

    if (matchedBin && serialRef.current.isConnected) {
      serialRef.current.sendBin(matchedBin.binNumber).then((response) => {
        if (response) {
          console.log("[Serial] Route for bin", matchedBin.binNumber, response);
        }
      });
    }
  }, []);

  const sendCatchAllBin = useCallback(() => {
    const catchAll = getCatchAllBin(binConfigsRef.current);
    if (catchAll && serialRef.current.isConnected) {
      serialRef.current.sendBin(catchAll.binNumber).then((response) => {
        if (response) {
          console.log("[Serial] Route unmatched card to catch-all bin", catchAll.binNumber, response);
        }
      });
    }
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
      value={{ cards, isLoading, addCard, sendCatchAllBin, removeCard, correctCard, clearCards }}
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
