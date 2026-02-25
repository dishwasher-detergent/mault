import { Search } from "@/lib/api-card";
import { SearchById } from "@/lib/api-scryfall";
import {
  canvasToBlob,
  detectCard,
  drawDetectionOverlay,
  extractCardImage,
} from "@/lib/card-detection";
import {
  type CardContour,
  type CardScannerProps,
  type DetectionResult,
  type ScannerStatus,
  type ScryfallCardWithDistance,
} from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

const STABILITY_FRAMES = 5;
const DETECTION_INTERVAL_MS = 100;
const SCANNABLE_STATUSES: ScannerStatus[] = [
  "scanning",
  "no-match",
  "duplicate",
];

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

/** Search for a card by capturing a region (or full frame) from a canvas. */
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  /**
   * Shared capture-and-search logic used by both auto-capture and force scan.
   * @param checkDuplicate - When true, compares against lastScannedCardId.
   * @param contour - Card contour for extraction; null uses full canvas.
   */
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

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const startCamera = useCallback(async () => {
    updateStatus("requesting-camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities =
            track.getCapabilities() as MediaTrackCapabilities & {
              focusMode?: string[];
            };
          if (capabilities.focusMode?.includes("continuous")) {
            await track.applyConstraints({
              advanced: [
                { focusMode: "continuous" } as MediaTrackConstraintSet,
              ],
            });
          }
        } catch {
          console.error("Failed to set camera focus mode");
        }
      }

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();

      const { videoWidth: width, videoHeight: height } = video;
      for (const canvasRef of [
        displayCanvasRef,
        overlayCanvasRef,
        processingCanvasRef,
      ]) {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = width;
          canvas.height = height;
        }
      }

      pausedRef.current = true;
      updateStatus("paused");
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and try again."
          : "Could not access camera. Please check your device.";
      handleError(msg);
    }
  }, [handleError, updateStatus]);

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

  const initScanner = useCallback(async () => {
    updateStatus("initializing");
    await startCamera();
    rafRef.current = requestAnimationFrame(detectionLoop);
  }, [startCamera, detectionLoop, updateStatus]);

  const handleRetryError = useCallback(async () => {
    setErrorMessage("");
    try {
      await initScanner();
    } catch {
      handleError("Failed to reinitialize scanner");
    }
  }, [initScanner, handleError]);

  useEffect(() => {
    let cancelled = false;

    initScanner().catch(() => {
      if (!cancelled) handleError("Failed to initialize scanner");
    });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [initScanner, stopCamera, handleError]);

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
