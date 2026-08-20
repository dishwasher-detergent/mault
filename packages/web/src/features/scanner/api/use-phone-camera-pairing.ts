import { useCameraSignalChannel } from "@/features/scanner/api/use-camera-signal-channel";
import type {
  WebrtcSignalKind,
  WebrtcSignalMessage,
} from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const READY_BROADCAST_INTERVAL_MS = 2000;
const CONNECT_TIMEOUT_MS = 15000;

export type PhoneCameraPairingStatus =
  | "idle"
  | "waiting"
  | "connecting"
  | "connected"
  | "error";

export function usePhoneCameraPairing(
  collectionGuid: string | undefined,
  onStream: (stream: MediaStream) => void,
  onDisconnect: () => void,
) {
  const [status, setStatus] = useState<PhoneCameraPairingStatus>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const readyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pairedRef = useRef(false);
  const sendRef = useRef<(kind: WebrtcSignalKind, payload: unknown) => void>(
    () => {},
  );
  const onStreamRef = useRef(onStream);
  const onDisconnectRef = useRef(onDisconnect);
  onStreamRef.current = onStream;
  onDisconnectRef.current = onDisconnect;

  const stopReadyBroadcast = useCallback(() => {
    if (readyIntervalRef.current) {
      clearInterval(readyIntervalRef.current);
      readyIntervalRef.current = null;
    }
  }, []);

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const cleanupPeerConnection = useCallback(() => {
    stopReadyBroadcast();
    clearConnectTimeout();
    pairedRef.current = false;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, [stopReadyBroadcast, clearConnectTimeout]);

  const handleMessage = useCallback(
    (message: WebrtcSignalMessage) => {
      if (message.kind === "leave") {
        cleanupPeerConnection();
        setStatus("idle");
        onDisconnectRef.current();
        return;
      }

      if (message.kind === "offer" && !pairedRef.current) {
        pairedRef.current = true;
        stopReadyBroadcast();
        setStatus("connecting");

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        pc.ontrack = (e) => {
          onStreamRef.current(e.streams[0] ?? new MediaStream([e.track]));
        };
        pc.onicecandidate = (e) => {
          if (e.candidate)
            sendRef.current("ice-candidate", e.candidate.toJSON());
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            clearConnectTimeout();
            setStatus("connected");
          } else if (
            ["disconnected", "failed", "closed"].includes(pc.connectionState)
          ) {
            cleanupPeerConnection();
            setStatus("idle");
            onDisconnectRef.current();
          }
        };

        connectTimeoutRef.current = setTimeout(() => {
          cleanupPeerConnection();
          setStatus("error");
        }, CONNECT_TIMEOUT_MS);

        (async () => {
          try {
            await pc.setRemoteDescription(
              message.payload as RTCSessionDescriptionInit,
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendRef.current("answer", answer);
          } catch {
            cleanupPeerConnection();
            setStatus("error");
          }
        })();
        return;
      }

      if (message.kind === "ice-candidate" && pcRef.current) {
        pcRef.current
          .addIceCandidate(message.payload as RTCIceCandidateInit)
          .catch(() => {});
      }
    },
    [cleanupPeerConnection, stopReadyBroadcast],
  );

  const { send } = useCameraSignalChannel(
    collectionGuid,
    "desktop",
    handleMessage,
  );
  sendRef.current = send;

  const start = useCallback(() => {
    if (!collectionGuid) return;
    pairedRef.current = false;
    setStatus("waiting");
    send("ready", null);
    readyIntervalRef.current = setInterval(
      () => send("ready", null),
      READY_BROADCAST_INTERVAL_MS,
    );
  }, [collectionGuid, send]);

  const stop = useCallback(() => {
    send("leave", null);
    cleanupPeerConnection();
    setStatus("idle");
  }, [send, cleanupPeerConnection]);

  useEffect(() => cleanupPeerConnection, [cleanupPeerConnection]);

  return { status, start, stop };
}
