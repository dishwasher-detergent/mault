import { loadOpenCv } from "@/features/scanner/lib/opencv-loader";
import type {
  CameraContextValue,
  CameraStatus,
  ZoomRange,
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
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      zoom: true,
    } as MediaTrackConstraints,
  });

  const track = stream.getVideoTracks()[0];
  if (track) {
    try {
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
        focusMode?: string[];
        zoom?: { min: number; max: number; step: number };
      };
      const constraints: MediaTrackConstraintSet[] = [];
      if (capabilities.focusMode?.includes("continuous")) {
        constraints.push({ focusMode: "continuous" } as MediaTrackConstraintSet);
      }
      if (capabilities.zoom) {
        constraints.push({ zoom: capabilities.zoom.min } as MediaTrackConstraintSet);
      }
      if (constraints.length > 0) {
        await track.applyConstraints({ advanced: constraints });
      }
    } catch {
      // constraints not supported, ignore
    }
  }

  return stream;
}

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [zoom, setZoomState] = useState(1);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setStatus("requesting");
    setErrorMessage("");
    try {
      const mediaStream = await acquireStream();
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus("ready");

      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const caps = track.getCapabilities() as MediaTrackCapabilities & {
          zoom?: { min: number; max: number; step: number };
        };
        if (caps.zoom) {
          setZoomRange(caps.zoom);
          setZoomState(caps.zoom.min);
        } else {
          setZoomRange(null);
        }
      }
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and try again."
          : "Could not access camera. Please check your device.";
      setErrorMessage(msg);
      setStatus("error");
    }
  }, []);

  const setZoom = useCallback((value: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] }).catch(() => {});
    setZoomState(value);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
      setStream(null);
    }
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const retryCamera = useCallback(async () => {
    stopCamera();
    await startCamera();
  }, [startCamera, stopCamera]);

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
    <CameraContext value={{ stream, status, errorMessage, zoom, zoomRange, setZoom, retryCamera, stopCamera }}>
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
