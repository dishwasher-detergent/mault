import { postWebrtcSignal } from "@/features/collections/api/webrtc-signal";
import { createSessionEventSource } from "@/lib/api/session";
import type { WebrtcSignalKind, WebrtcSignalMessage, WebrtcSignalRole } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

// Thin transport shared by the desktop pairing hook and the phone camera
// page: relays WebRTC offer/answer/ICE messages over the collection's
// existing session SSE stream (see server routes/collections.ts's
// /:guid/webrtc-signal + /:guid/stream). `ownRole` filters out a client's
// own broadcasts - this also makes it a no-op if the same user has two
// desktop tabs open, since both would carry role "desktop".
export function useCameraSignalChannel(
  collectionGuid: string | undefined,
  ownRole: WebrtcSignalRole,
  onMessage: (message: WebrtcSignalMessage) => void,
) {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!collectionGuid) return;

    let cancelled = false;
    setConnected(false);

    createSessionEventSource(collectionGuid).then((es) => {
      if (cancelled) {
        es.close();
        return;
      }
      esRef.current = es;

      es.addEventListener("webrtc_signal", (e) => {
        const message = JSON.parse((e as MessageEvent).data) as WebrtcSignalMessage;
        if (message.role === ownRole) return;
        onMessageRef.current(message);
      });

      es.onopen = () => setConnected(true);
      es.onerror = () => setConnected(false);
    });

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [collectionGuid, ownRole]);

  const send = useCallback(
    (kind: WebrtcSignalKind, payload: unknown) => {
      if (!collectionGuid) return;
      postWebrtcSignal(collectionGuid, { role: ownRole, kind, payload }).catch(() => {});
    },
    [collectionGuid, ownRole],
  );

  return { send, connected };
}
