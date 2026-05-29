import type { Collection, ScannedCard } from "@magic-vault/shared";
import { createSessionEventSource } from "@/lib/api/session";
import { useEffect, useRef, useState } from "react";

type ConnectionStatus = "connecting" | "connected" | "error" | "closed";

export interface SessionViewer {
  userId: string;
  displayName: string;
}

export interface SessionError {
  id: string;
  message: string;
  timestamp: number;
}

export interface SessionMonitorState {
  collection: Collection | null;
  cards: ScannedCard[];
  viewers: SessionViewer[];
  errors: SessionError[];
  status: ConnectionStatus;
}

export function useSessionMonitor(collectionGuid: string | undefined): SessionMonitorState {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [cards, setCards] = useState<ScannedCard[]>([]);
  const [viewers, setViewers] = useState<SessionViewer[]>([]);
  const [errors, setErrors] = useState<SessionError[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const pushError = (message: string) =>
    setErrors((prev) => [
      { id: `${Date.now()}-${Math.random()}`, message, timestamp: Date.now() },
      ...prev,
    ]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!collectionGuid) return;

    let cancelled = false;
    setStatus("connecting");
    setCards([]);
    setCollection(null);
    setViewers([]);
    setErrors([]);

    createSessionEventSource(collectionGuid).then((es) => {
      if (cancelled) { es.close(); return; }
      esRef.current = es;

      es.addEventListener("session_init", (e) => {
        const { collection, cards, viewers: initViewers } = JSON.parse((e as MessageEvent).data) as {
          collection: Collection;
          cards: ScannedCard[];
          viewers?: SessionViewer[];
        };
        setCollection(collection);
        setCards(cards);
        if (initViewers) setViewers(initViewers);
        setStatus("connected");
      });

      es.addEventListener("viewers_updated", (e) => {
        const { viewers: updated } = JSON.parse((e as MessageEvent).data) as { viewers: SessionViewer[] };
        setViewers(updated);
      });

      es.addEventListener("card_added", (e) => {
        const card = JSON.parse((e as MessageEvent).data) as ScannedCard;
        setCards((prev) => [card, ...prev]);
      });

      es.addEventListener("card_updated", (e) => {
        const updated = JSON.parse((e as MessageEvent).data) as ScannedCard;
        setCards((prev) =>
          prev.map((c) => (c.scanId === updated.scanId ? updated : c)),
        );
      });

      es.addEventListener("card_removed", (e) => {
        const { scanId } = JSON.parse((e as MessageEvent).data) as { scanId: string };
        setCards((prev) => prev.filter((c) => c.scanId !== scanId));
      });

      es.addEventListener("cards_removed", (e) => {
        const { scanIds } = JSON.parse((e as MessageEvent).data) as { scanIds: string[] };
        const ids = new Set(scanIds);
        setCards((prev) => prev.filter((c) => !ids.has(c.scanId)));
      });

      es.addEventListener("cards_cleared", () => {
        setCards([]);
      });

      es.addEventListener("scan_error", (e) => {
        const { message } = JSON.parse((e as MessageEvent).data) as { message: string };
        pushError(message);
      });

      es.onerror = () => {
        setStatus("error");
        pushError("Connection to session lost.");
      };

      es.onopen = () => {
        setStatus("connected");
      };
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
      setStatus("closed");
    };
  }, [collectionGuid]);

  return { collection, cards, viewers, errors, status };
}
