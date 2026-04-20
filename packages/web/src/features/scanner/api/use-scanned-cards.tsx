import {
  type ScannedCard,
  type ScryfallCard,
  type ScryfallCardWithDistance,
  evaluateCardBin,
  getCatchAllBin,
} from "@magic-vault/shared";

import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import {
  addCollectionCard,
  clearCollectionCards,
  loadCollectionCards,
  removeCollectionCard,
  removeCollectionCards,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { useSerial } from "@/features/scanner/api/use-serial";
import { toast } from "sonner";
import type { ScannedCardsContextValue } from "@/features/scanner/types";
import { generateScanId } from "@/lib/idb";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const ScannedCardsContext = createContext<ScannedCardsContextValue | null>(null);

export function ScannedCardsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cards, setCards] = useState<ScannedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { configs: binConfigs } = useBinConfigs();
  const { sendBin, sendCommand, receiveResponse, isConnected, isReady } = useSerial();
  const { activeCollection } = useCollections();

  const binConfigsRef = useRef(binConfigs);
  const serialRef = useRef({ sendBin, sendCommand, receiveResponse, isConnected, isReady });
  const activeCollectionRef = useRef(activeCollection);
  const [autoFeed, setAutoFeedState] = useState(false);
  const autoFeedRef = useRef(false);

  useEffect(() => {
    binConfigsRef.current = binConfigs;
  }, [binConfigs]);

  useEffect(() => {
    serialRef.current = { sendBin, sendCommand, receiveResponse, isConnected, isReady };
  }, [sendBin, sendCommand, receiveResponse, isConnected, isReady]);

  const setAutoFeed = useCallback((enabled: boolean) => {
    autoFeedRef.current = enabled;
    setAutoFeedState(enabled);
  }, []);

  const triggerAutoFeed = useCallback(async () => {
    const sent = await serialRef.current.sendCommand(JSON.stringify({ feeder: true }));
    if (!sent) {
      autoFeedRef.current = false;
      setAutoFeedState(false);
      toast.error("Auto-feed failed", { description: "Could not send feeder command." });
      return;
    }
    const response = await serialRef.current.receiveResponse(10000);
    if (!response) {
      autoFeedRef.current = false;
      setAutoFeedState(false);
      toast.error("Auto-feed timeout", { description: "Feeder did not respond in time." });
      return;
    }
    try {
      const parsed = JSON.parse(response) as Record<string, unknown>;
      if (parsed.error) {
        autoFeedRef.current = false;
        setAutoFeedState(false);
        toast.error("Feeder error", {
          description: String(parsed.error),
          duration: Infinity,
          dismissible: true,
        });
      }
    } catch {
      autoFeedRef.current = false;
      setAutoFeedState(false);
      toast.error("Auto-feed error", { description: "Unexpected response from feeder." });
    }
  }, []);

  useEffect(() => {
    activeCollectionRef.current = activeCollection;
  }, [activeCollection]);

  // Reload cards when active collection changes
  useEffect(() => {
    if (!activeCollection) {
      setCards([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setCards([]);
    setIsLoading(true);

    loadCollectionCards(activeCollection.guid)
      .then((r) => {
        if (!cancelled) setCards(r.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load collection cards:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCollection?.guid]); // eslint-disable-line react-hooks/exhaustive-deps

  const addCard = useCallback((card: ScryfallCardWithDistance) => {
    const collection = activeCollectionRef.current;
    if (!collection) {
      toast.error("No collection selected", {
        description: "Create or select a collection before scanning.",
      });
      return;
    }

    const matchedBin = evaluateCardBin(card, binConfigsRef.current);
    const record: ScannedCard = {
      scanId: generateScanId(),
      card,
      scannedAt: Date.now(),
      binNumber: matchedBin?.binNumber,
    };

    // Optimistic update
    setCards((prev) => [record, ...prev]);

    // Persist to server (fire-and-forget)
    addCollectionCard(collection.guid, record).catch((err) =>
      console.error("Failed to persist card:", err),
    );

    if (matchedBin && serialRef.current.isConnected && serialRef.current.isReady) {
      serialRef.current.sendBin(matchedBin.binNumber).then((response) => {
        if (!response) {
          toast.error("Routing failed", {
            description: `No response from sorter for bin ${matchedBin.binNumber}.`,
          });
          autoFeedRef.current = false;
          setAutoFeedState(false);
          return;
        }
        const res = response as Record<string, unknown>;
        if (res.error) {
          toast.error("Sorter error", {
            description: String(res.error),
            duration: Infinity,
            dismissible: true,
          });
          autoFeedRef.current = false;
          setAutoFeedState(false);
          return;
        }
        if (autoFeedRef.current) {
          triggerAutoFeed();
        }
      });
    }
  }, [triggerAutoFeed]);

  const sendCatchAllBin = useCallback(() => {
    const catchAll = getCatchAllBin(binConfigsRef.current);
    if (catchAll && serialRef.current.isConnected && serialRef.current.isReady) {
      serialRef.current.sendBin(catchAll.binNumber).then((response) => {
        if (!response) {
          toast.error("Routing failed", {
            description: `No response from sorter for catch-all bin ${catchAll.binNumber}.`,
          });
          autoFeedRef.current = false;
          setAutoFeedState(false);
          return;
        }
        const res = response as Record<string, unknown>;
        if (res.error) {
          toast.error("Sorter error", {
            description: String(res.error),
            duration: Infinity,
            dismissible: true,
          });
          autoFeedRef.current = false;
          setAutoFeedState(false);
          return;
        }
        if (autoFeedRef.current) {
          triggerAutoFeed();
        }
      });
    }
  }, [triggerAutoFeed]);

  const removeCard = useCallback((scanId: string) => {
    const collection = activeCollectionRef.current;
    setCards((prev) => prev.filter((entry) => entry.scanId !== scanId));
    if (collection) {
      removeCollectionCard(collection.guid, scanId).catch((err) =>
        console.error("Failed to remove card:", err),
      );
    }
  }, []);

  const removeCards = useCallback((scanIds: string[]) => {
    const collection = activeCollectionRef.current;
    const idSet = new Set(scanIds);
    setCards((prev) => prev.filter((entry) => !idSet.has(entry.scanId)));
    if (collection) {
      removeCollectionCards(collection.guid, scanIds).catch((err) =>
        console.error("Failed to remove cards:", err),
      );
    }
  }, []);

  const correctCard = useCallback((scanId: string, card: ScryfallCard) => {
    const collection = activeCollectionRef.current;
    const corrected: ScryfallCardWithDistance = { ...card, distance: 0 };
    const matchedBin = evaluateCardBin(corrected, binConfigsRef.current);
    setCards((prev) =>
      prev.map((entry) =>
        entry.scanId === scanId
          ? { ...entry, card: corrected, binNumber: matchedBin?.binNumber }
          : entry,
      ),
    );
    if (collection) {
      updateCollectionCard(collection.guid, scanId, corrected, matchedBin?.binNumber).catch(
        (err) => console.error("Failed to update card:", err),
      );
    }
  }, []);

  const clearCards = useCallback(() => {
    const collection = activeCollectionRef.current;
    setCards([]);
    if (collection) {
      clearCollectionCards(collection.guid).catch((err) =>
        console.error("Failed to clear cards:", err),
      );
    }
  }, []);

  return (
    <ScannedCardsContext
      value={{
        cards,
        isLoading,
        autoFeed,
        setAutoFeed,
        addCard,
        sendCatchAllBin,
        removeCard,
        removeCards,
        correctCard,
        clearCards,
      }}
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
