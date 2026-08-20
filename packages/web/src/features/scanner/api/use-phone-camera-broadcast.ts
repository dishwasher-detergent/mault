import { useCameraSignalChannel } from "@/features/scanner/api/use-camera-signal-channel";
import type { WebrtcSignalMessage } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export type PhoneCameraBroadcastStatus =
  | "requesting-camera"
  | "camera-error"
  | "waiting"
  | "connecting"
  | "connected"
  | "disconnected";

// Phone side of "use a phone as a webcam": grabs the back camera and just
// sits there responding to the desktop's "ready" pings with a WebRTC offer -
// no capture button, no identification UI. Once connected, the desktop's
// CardScanner reads frames off this stream exactly as it would a local
// webcam; this hook's only job is getting the MediaStream there.
export function usePhoneCameraBroadcast(collectionGuid: string | undefined) {
  const [status, setStatus] = useState<PhoneCameraBroadcastStatus>("requesting-camera");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pairedRef = useRef(false);
  const sendRef = useRef<(kind: WebrtcSignalMessage["kind"], payload: unknown) => void>(() => {});

  const cleanupPeerConnection = useCallback(() => {
    pairedRef.current = false;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const createAndSendOffer = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    for (const track of stream.getTracks()) pc.addTrack(track, stream);

    pc.onicecandidate = (e) => {
      if (e.candidate) sendRef.current("ice-candidate", e.candidate.toJSON());
    };
    pc.onicecandidateerror = (e) => {
      const err = e as RTCPeerConnectionIceErrorEvent;
      console.warn(
        `[phone-camera] ICE candidate error (${err.errorCode}): ${err.errorText}`,
      );
    };
    pc.onconnectionstatechange = () => {
      console.info("[phone-camera] phone connectionState:", pc.connectionState);
      if (pc.connectionState === "connected") setStatus("connected");
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        cleanupPeerConnection();
        setStatus("waiting");
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendRef.current("offer", offer);
    } catch {
      cleanupPeerConnection();
      pairedRef.current = false;
      setStatus("waiting");
    }
  }, [cleanupPeerConnection]);

  const handleMessage = useCallback(
    (message: WebrtcSignalMessage) => {
      if (message.kind === "ready" && !pairedRef.current && localStreamRef.current) {
        pairedRef.current = true;
        setStatus("connecting");
        void createAndSendOffer();
        return;
      }
      if (message.kind === "answer" && pcRef.current) {
        pcRef.current
          .setRemoteDescription(message.payload as RTCSessionDescriptionInit)
          .catch(() => {});
        return;
      }
      if (message.kind === "ice-candidate" && pcRef.current) {
        pcRef.current.addIceCandidate(message.payload as RTCIceCandidateInit).catch(() => {});
        return;
      }
      if (message.kind === "leave") {
        cleanupPeerConnection();
        setStatus("waiting");
      }
    },
    [createAndSendOffer, cleanupPeerConnection],
  );

  const { send } = useCameraSignalChannel(collectionGuid, "phone", handleMessage);
  sendRef.current = send;

  const cancelledRef = useRef(false);

  const requestCamera = useCallback(async () => {
    setErrorMessage("");
    setStatus("requesting-camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (cancelledRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setStatus("waiting");
    } catch (err) {
      if (cancelledRef.current) return;
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStatus("camera-error");
    }
  }, []);

  // User tapped "Disconnect": tell the desktop so it resets cleanly instead
  // of waiting out an ICE timeout, then actually release the camera (so it
  // stops draining battery) rather than just idling in "waiting".
  const disconnect = useCallback(() => {
    send("leave", null);
    pairedRef.current = false;
    cleanupPeerConnection();
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) track.stop();
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setStatus("disconnected");
  }, [send, cleanupPeerConnection]);

  const reconnect = useCallback(() => {
    pairedRef.current = false;
    void requestCamera();
  }, [requestCamera]);

  useEffect(() => {
    cancelledRef.current = false;
    void requestCamera();

    return () => {
      cancelledRef.current = true;
      cleanupPeerConnection();
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) track.stop();
        localStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, localStream, errorMessage, disconnect, reconnect };
}
