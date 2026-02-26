import { loadOpenCv } from "@/features/scanner/lib/opencv-loader";
import type {
  CameraContextValue,
  CameraStatus,
} from "@/features/scanner/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const CameraContext = createContext<CameraContextValue | null>(null);

async function acquireStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });

  const track = stream.getVideoTracks()[0];
  if (track) {
    try {
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
        focusMode?: string[];
      };
      if (capabilities.focusMode?.includes("continuous")) {
        await track.applyConstraints({
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
        });
      }
    } catch {
      // autofocus not supported, ignore
    }
  }

  return stream;
}

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setStatus("requesting");
    setErrorMessage("");
    try {
      const mediaStream = await acquireStream();
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus("ready");
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and try again."
          : "Could not access camera. Please check your device.";
      setErrorMessage(msg);
      setStatus("error");
    }
  }, []);

  const retryCamera = useCallback(async () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
      setStream(null);
    }
    await startCamera();
  }, [startCamera]);

  useEffect(() => {
    loadOpenCv().catch(() => {}); // preload OpenCV in background
    startCamera();

    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  return (
    <CameraContext value={{ stream, status, errorMessage, retryCamera }}>
      {children}
    </CameraContext>
  );
}

export function useCameraContext() {
  const ctx = useContext(CameraContext);
  if (!ctx)
    throw new Error("useCameraContext must be used within a CameraProvider");
  return ctx;
}
