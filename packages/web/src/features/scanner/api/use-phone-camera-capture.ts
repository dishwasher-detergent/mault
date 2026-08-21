import { useCameraSignalChannel } from "@/features/scanner/api/use-camera-signal-channel";
import type { PhoneCameraMessage } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

// The phone heartbeats "camera_ready" roughly this often while its camera
// is live (see use-phone-camera-responder.ts) - if we haven't heard one in
// a while, treat it as gone rather than waiting forever.
const PRESENCE_TIMEOUT_MS = 8000;
const CAPTURE_TIMEOUT_MS = 8000;

export type PhoneCameraCaptureStatus = "idle" | "waiting" | "connected" | "error";

interface PendingCapture {
  requestId: string;
  resolve: (dataUrl: string | null) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// Desktop side of "use a phone as a webcam": tracks whether a phone (paired
// via the QR/link shown in the pairing dialog) is currently present and
// ready, and lets the scanner ask it for a single fresh photo on demand -
// no continuous video, no WebRTC. Each capture is a plain request/response
// over the collection's existing session SSE stream + a REST POST, so it
// works across any network the app's normal API already reaches.
export function usePhoneCameraCapture(collectionGuid: string | undefined) {
  const [status, setStatus] = useState<PhoneCameraCaptureStatus>("idle");
  const activeRef = useRef(false);
  const presenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCaptureRef = useRef<PendingCapture | null>(null);

  const clearPresenceTimeout = useCallback(() => {
    if (presenceTimeoutRef.current) {
      clearTimeout(presenceTimeoutRef.current);
      presenceTimeoutRef.current = null;
    }
  }, []);

  const markAbsent = useCallback(() => {
    clearPresenceTimeout();
    if (activeRef.current) setStatus("waiting");
  }, [clearPresenceTimeout]);

  const resolvePending = useCallback((dataUrl: string | null) => {
    const pending = pendingCaptureRef.current;
    if (!pending) return;
    clearTimeout(pending.timeout);
    pendingCaptureRef.current = null;
    pending.resolve(dataUrl);
  }, []);

  const handleMessage = useCallback(
    (message: PhoneCameraMessage) => {
      if (message.kind === "camera_ready") {
        if (!activeRef.current) return;
        setStatus("connected");
        clearPresenceTimeout();
        presenceTimeoutRef.current = setTimeout(markAbsent, PRESENCE_TIMEOUT_MS);
        return;
      }
      if (message.kind === "camera_left") {
        markAbsent();
        resolvePending(null);
        return;
      }
      if (message.kind === "capture_response" && pendingCaptureRef.current) {
        if (pendingCaptureRef.current.requestId === message.requestId) {
          resolvePending(message.imageDataUrl ?? null);
        }
      }
    },
    [clearPresenceTimeout, markAbsent, resolvePending],
  );

  const { send } = useCameraSignalChannel(collectionGuid, handleMessage);

  const start = useCallback(() => {
    activeRef.current = true;
    setStatus("waiting");
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    clearPresenceTimeout();
    setStatus("idle");
    resolvePending(null);
  }, [clearPresenceTimeout, resolvePending]);

  const requestCapture = useCallback((): Promise<string | null> => {
    if (status !== "connected") return Promise.resolve(null);
    return new Promise((resolve) => {
      resolvePending(null); // cancel any stale in-flight request first
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        pendingCaptureRef.current = null;
        resolve(null);
      }, CAPTURE_TIMEOUT_MS);
      pendingCaptureRef.current = { requestId, resolve, timeout };
      send({ kind: "capture_requested", requestId });
    });
  }, [status, send, resolvePending]);

  useEffect(() => stop, [stop]);

  return { status, start, stop, requestCapture };
}
