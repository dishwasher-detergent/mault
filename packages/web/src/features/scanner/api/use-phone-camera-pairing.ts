import { useCameraSignalChannel } from "@/features/scanner/api/use-camera-signal-channel";
import type { WebrtcSignalKind, WebrtcSignalMessage } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const READY_BROADCAST_INTERVAL_MS = 2000;

export type PhoneCameraPairingStatus =
  | "idle"
  | "waiting"
  | "connecting"
  | "connected"
  | "error";

// Desktop side of "use a phone as a webcam": waits for a phone (paired via
// the QR/link shown in the pairing dialog) to send a WebRTC offer, answers
// it, and hands the resulting remote MediaStream back to the caller -
// CameraProvider drops it straight into the same `stream` state a local
// getUserMedia() would have produced, so nothing downstream needs to know
// the difference.
export function usePhoneCameraPairing(
  collectionGuid: string | undefined,
  onStream: (stream: MediaStream) => void,
  onDisconnect: () => void,
) {
  const [status, setStatus] = useState<PhoneCameraPairingStatus>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const readyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pairedRef = useRef(false);
  const sendRef = useRef<(kind: WebrtcSignalKind, payload: unknown) => void>(() => {});
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

  const cleanupPeerConnection = useCallback(() => {
    stopReadyBroadcast();
    pairedRef.current = false;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, [stopReadyBroadcast]);

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
          setStatus("connected");
          onStreamRef.current(e.streams[0] ?? new MediaStream([e.track]));
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) sendRef.current("ice-candidate", e.candidate.toJSON());
        };
        pc.onconnectionstatechange = () => {
          if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
            cleanupPeerConnection();
            setStatus("idle");
            onDisconnectRef.current();
          }
        };

        (async () => {
          try {
            await pc.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
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
        pcRef.current.addIceCandidate(message.payload as RTCIceCandidateInit).catch(() => {});
      }
    },
    [cleanupPeerConnection, stopReadyBroadcast],
  );

  const { send } = useCameraSignalChannel(collectionGuid, "desktop", handleMessage);
  sendRef.current = send;

  const start = useCallback(() => {
    if (!collectionGuid) return;
    pairedRef.current = false;
    setStatus("waiting");
    send("ready", null);
    readyIntervalRef.current = setInterval(() => send("ready", null), READY_BROADCAST_INTERVAL_MS);
  }, [collectionGuid, send]);

  const stop = useCallback(() => {
    send("leave", null);
    cleanupPeerConnection();
    setStatus("idle");
  }, [send, cleanupPeerConnection]);

  useEffect(() => cleanupPeerConnection, [cleanupPeerConnection]);

  return { status, start, stop };
}
