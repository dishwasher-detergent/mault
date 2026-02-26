import { Search } from "@/features/cards/api/card";
import { SearchById } from "@/features/cards/api/scryfall";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import {
  canvasToBlob,
  detectCard,
  drawDetectionOverlay,
  extractCardImage,
} from "@/features/scanner/lib/card-detection";
import { loadOpenCv } from "@/features/scanner/lib/opencv-loader";
import {
  type CardContour,
  type CardScannerProps,
  type DetectionResult,
  type ScannerStatus,
  type ScryfallCardWithDistance,
} from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DETECTION_INTERVAL_MS,
  SCANNABLE_STATUSES,
  STABILITY_FRAMES,
} from "../constants";

function playDingSound() {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);
  oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);

  oscillator.onended = () => ctx.close();
}

async function searchCardImage(
  canvas: HTMLCanvasElement,
  contour?: CardContour | null,
): Promise<ScryfallCardWithDistance | null> {
  const sourceCanvas = contour ? extractCardImage(canvas, contour) : canvas;
  const blob = await canvasToBlob(sourceCanvas);
  const formData = new FormData();
  formData.append("image", blob, "card.jpg");

  const { data } = await Search(formData);
  if (!data) return null;

  const { data: scryfallCard } = await SearchById(data.scryfallId);
  return { ...scryfallCard!, distance: data.distance };
}

export function useCardScanner({
  onSearchResults,
  onNoMatch,
  onError,
}: Omit<CardScannerProps, "className"> = {}) {
  const {
    stream,
    status: cameraStatus,
    errorMessage: cameraError,
    retryCamera,
  } = useCameraContext();

  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastDetectionRef = useRef<number>(0);
  const stableCountRef = useRef<number>(0);
  const lastResultRef = useRef<DetectionResult | null>(null);

  const statusRef = useRef<ScannerStatus>("initializing");
  const pausedRef = useRef(true);
  const lastScannedCardIdRef = useRef<string | null>(null);
  const needsCardRemovalRef = useRef(false);
  const isCapturingRef = useRef(false);
  const onSearchResultsRef = useRef(onSearchResults);
  const onNoMatchRef = useRef(onNoMatch);
  const handleErrorRef = useRef<(msg: string) => void>(() => {});

  const [status, setStatus] = useState<ScannerStatus>("initializing");
  const [errorMessage, setErrorMessage] = useState("");
  const [isStable, setIsStable] = useState(false);
  const [duplicateCard, setDuplicateCard] =
    useState<ScryfallCardWithDistance | null>(null);

  const updateStatus = useCallback((newStatus: ScannerStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  }, []);

  const handleError = useCallback(
    (msg: string) => {
      updateStatus("error");
      setErrorMessage(msg);
      onError?.(msg);
    },
    [onError, updateStatus],
  );

  const resetStability = useCallback(() => {
    stableCountRef.current = 0;
    setIsStable(false);
  }, []);

  useEffect(() => {
    onSearchResultsRef.current = onSearchResults;
  }, [onSearchResults]);

  useEffect(() => {
    onNoMatchRef.current = onNoMatch;
  }, [onNoMatch]);

  useEffect(() => {
    handleErrorRef.current = handleError;
  }, [handleError]);

  // Sync camera-level status/errors into scanner status
  useEffect(() => {
    if (cameraStatus === "requesting") {
      updateStatus("requesting-camera");
    } else if (cameraStatus === "error") {
      updateStatus("error");
      setErrorMessage(cameraError);
    } else if (cameraStatus === "idle") {
      updateStatus("initializing");
    }
    // 'ready' is handled by the stream attachment effect below
  }, [cameraStatus, cameraError, updateStatus]);

  const performCapture = useCallback(
    async (checkDuplicate: boolean, contour?: CardContour | null) => {
      const canvas = displayCanvasRef.current;
      if (!canvas) {
        isCapturingRef.current = false;
        updateStatus("scanning");
        return;
      }

      try {
        const card = await searchCardImage(canvas, contour);

        if (card) {
          if (checkDuplicate && lastScannedCardIdRef.current === card.id) {
            setDuplicateCard(card);
            updateStatus("duplicate");
          } else {
            lastScannedCardIdRef.current = card.id;
            onSearchResultsRef.current?.([card]);
            updateStatus("scanning");
          }
        } else {
          playDingSound();
          onNoMatchRef.current?.();
          updateStatus("no-match");
        }

        needsCardRemovalRef.current = true;
      } catch (err) {
        handleErrorRef.current(
          err instanceof Error ? err.message : "Failed to search card",
        );
      } finally {
        isCapturingRef.current = false;
      }
    },
    [updateStatus],
  );

  const detectionLoop = useCallback(() => {
    const video = videoRef.current;
    const displayCanvas = displayCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const processingCanvas = processingCanvasRef.current;

    if (!video || !displayCanvas || !overlayCanvas || !processingCanvas) return;
    if (video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(detectionLoop);
      return;
    }

    const displayCtx = displayCanvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    const processingCtx = processingCanvas.getContext("2d");

    if (!displayCtx || !overlayCtx || !processingCtx) return;

    if (pausedRef.current) {
      rafRef.current = requestAnimationFrame(detectionLoop);
      return;
    }

    displayCtx.drawImage(video, 0, 0);

    const now = performance.now();
    if (now - lastDetectionRef.current >= DETECTION_INTERVAL_MS) {
      lastDetectionRef.current = now;

      processingCtx.drawImage(video, 0, 0);
      const imageData = processingCtx.getImageData(
        0,
        0,
        processingCanvas.width,
        processingCanvas.height,
      );

      const result = detectCard(imageData);

      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      drawDetectionOverlay(overlayCtx, result);

      if (result.detected) {
        stableCountRef.current++;
        lastResultRef.current = result;
      } else {
        stableCountRef.current = 0;
        lastResultRef.current = null;

        if (needsCardRemovalRef.current) {
          needsCardRemovalRef.current = false;
          setDuplicateCard(null);
          if (SCANNABLE_STATUSES.includes(statusRef.current)) {
            updateStatus("scanning");
          }
        }
      }

      const stable = stableCountRef.current >= STABILITY_FRAMES;
      setIsStable(stable);

      if (
        stable &&
        !needsCardRemovalRef.current &&
        !isCapturingRef.current &&
        statusRef.current === "scanning"
      ) {
        const captureResult = lastResultRef.current;
        if (captureResult?.detected && captureResult.contour) {
          isCapturingRef.current = true;
          updateStatus("searching");
          performCapture(true, captureResult.contour);
        }
      }
    }

    rafRef.current = requestAnimationFrame(detectionLoop);
  }, [updateStatus, performCapture]);

  // Attach stream to video/canvases and start the detection loop.
  // Re-runs if the stream is replaced (e.g. after retryCamera).
  // On unmount: cancels the RAF loop but does NOT stop the stream tracks —
  // the CameraProvider owns the stream lifetime.
  useEffect(() => {
    if (!stream) return;

    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    updateStatus("initializing");
    video.srcObject = stream;

    (async () => {
      try {
        await video.play();
        if (cancelled) return;

        const { videoWidth: width, videoHeight: height } = video;
        for (const ref of [
          displayCanvasRef,
          overlayCanvasRef,
          processingCanvasRef,
        ]) {
          if (ref.current) {
            ref.current.width = width;
            ref.current.height = height;
          }
        }

        // Wait for OpenCV to finish loading before starting detection
        await loadOpenCv();
        if (cancelled) return;

        pausedRef.current = true;
        updateStatus("paused");
        rafRef.current = requestAnimationFrame(detectionLoop);
      } catch (err) {
        if (!cancelled) {
          handleErrorRef.current(
            err instanceof Error ? err.message : "Failed to start video",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      video.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  const handleForceAddDuplicate = useCallback(() => {
    if (duplicateCard) {
      onSearchResultsRef.current?.([duplicateCard]);
      setDuplicateCard(null);
      updateStatus("scanning");
    }
  }, [duplicateCard, updateStatus]);

  const handleForceScan = useCallback(() => {
    if (
      isCapturingRef.current ||
      !SCANNABLE_STATUSES.includes(statusRef.current)
    )
      return;

    isCapturingRef.current = true;
    updateStatus("searching");
    setDuplicateCard(null);

    const result = lastResultRef.current;
    const contour = result?.detected ? result.contour : null;
    performCapture(false, contour);
  }, [updateStatus, performCapture]);

  const handlePause = useCallback(() => {
    pausedRef.current = true;
    needsCardRemovalRef.current = false;
    resetStability();
    setDuplicateCard(null);
    updateStatus("paused");
  }, [updateStatus, resetStability]);

  const handleResume = useCallback(() => {
    pausedRef.current = false;
    resetStability();
    updateStatus("scanning");
  }, [updateStatus, resetStability]);

  const handleRetryError = useCallback(async () => {
    setErrorMessage("");
    try {
      await retryCamera();
    } catch {
      handleErrorRef.current("Failed to reinitialize camera");
    }
  }, [retryCamera]);

  return {
    status,
    errorMessage,
    isStable,
    duplicateCard,
    videoRef,
    displayCanvasRef,
    overlayCanvasRef,
    processingCanvasRef,
    handleForceAddDuplicate,
    handleForceScan,
    handlePause,
    handleResume,
    handleRetryError,
  };
}
