import { useCameraSignalChannel } from "@/features/scanner/api/use-camera-signal-channel";
import type { PhoneCameraMessage } from "@magic-vault/shared";
import { useCallback, useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL_MS = 3000;
const JPEG_QUALITY = 0.85;

// Phone side of "use a phone as a webcam": while the camera is live, tells
// the desktop it's here (a heartbeat, since either side can lose the SSE
// connection without a clean goodbye), and whenever the desktop asks for a
// photo, grabs the current frame off the already-rendering preview canvas
// (see use-video-canvas-preview.ts) and uploads it. No continuous
// streaming, no WebRTC - just a data URL relayed through the collection's
// existing session SSE stream + a REST POST, same as every other API call.
export function usePhoneCameraResponder(
  collectionGuid: string | undefined,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isCameraReady: boolean,
  onCapture?: () => void,
) {
  const sendRef = useRef<(message: PhoneCameraMessage) => void>(() => {});
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  const handleMessage = useCallback(
    (message: PhoneCameraMessage) => {
      if (message.kind !== "capture_requested" || !message.requestId) return;
      const canvas = canvasRef.current;
      if (!canvas || !canvas.width || !canvas.height) return;
      const imageDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      sendRef.current({
        kind: "capture_response",
        requestId: message.requestId,
        imageDataUrl,
      });
      onCaptureRef.current?.();
    },
    [canvasRef],
  );

  const { send } = useCameraSignalChannel(collectionGuid, handleMessage);
  sendRef.current = send;

  useEffect(() => {
    if (!isCameraReady) return;
    send({ kind: "camera_ready" });
    const interval = setInterval(
      () => send({ kind: "camera_ready" }),
      HEARTBEAT_INTERVAL_MS,
    );
    return () => {
      clearInterval(interval);
      send({ kind: "camera_left" });
    };
  }, [isCameraReady, send]);
}
