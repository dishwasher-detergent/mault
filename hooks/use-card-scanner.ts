import type {
  CardScannerProps,
  DetectionResult,
  ScannerStatus,
} from "@/interfaces/scanner.interface";
import type { ScryfallCardWithDistance } from "@/interfaces/scryfall.interface";
import {
  canvasToBlob,
  detectCard,
  drawDetectionOverlay,
  extractCardImage,
} from "@/lib/card-detection";
import { Search } from "@/lib/db/card";
import { loadOpenCv } from "@/lib/opencv-loader";
import { SearchById } from "@/lib/scryfall/search";
import { useCallback, useEffect, useRef, useState } from "react";

const STABILITY_FRAMES = 5;
const DETECTION_INTERVAL_MS = 100;

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

export function useCardScanner({
  onSearchResults,
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

  // Keep refs in sync with latest props/callbacks
  useEffect(() => {
    onSearchResultsRef.current = onSearchResults;
  }, [onSearchResults]);

  useEffect(() => {
    handleErrorRef.current = handleError;
  }, [handleError]);

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

      const width = video.videoWidth;
      const height = video.videoHeight;

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

      pausedRef.current = false;
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

    displayCtx.drawImage(video, 0, 0);

    // When paused, keep drawing video but skip detection
    if (pausedRef.current) {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      rafRef.current = requestAnimationFrame(detectionLoop);
      return;
    }

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

        // Card was removed — reset for next scan
        if (needsCardRemovalRef.current) {
          needsCardRemovalRef.current = false;
          setDuplicateCard(null);
          const currentStatus = statusRef.current;
          if (currentStatus === "duplicate" || currentStatus === "no-match") {
            updateStatus("scanning");
          }
        }
      }

      const stable = stableCountRef.current >= STABILITY_FRAMES;
      setIsStable(stable);

      // Auto-capture when card is stable and ready
      if (
        stable &&
        !needsCardRemovalRef.current &&
        !isCapturingRef.current &&
        statusRef.current === "scanning"
      ) {
        isCapturingRef.current = true;
        updateStatus("searching");

        const captureCanvas = displayCanvasRef.current;
        const captureResult = lastResultRef.current;

        if (captureCanvas && captureResult?.detected && captureResult.contour) {
          const cardCanvas = extractCardImage(
            captureCanvas,
            captureResult.contour,
          );

          canvasToBlob(cardCanvas)
            .then((blob) => {
              const formData = new FormData();
              formData.append("image", blob, "card.jpg");
              return Search(formData);
            })
            .then(async (data) => {
              if (data.data) {
                // TODO: Add check for if nothing comes back.
                const { data: scryfallCard } = await SearchById(
                  data.data.scryfallId,
                );
                const cardWithDistance: ScryfallCardWithDistance = {
                  ...scryfallCard!,
                  distance: data.data.distance,
                };

                if (lastScannedCardIdRef.current === scryfallCard!.id) {
                  setDuplicateCard(cardWithDistance);
                  updateStatus("duplicate");
                } else {
                  // New card — auto-add
                  lastScannedCardIdRef.current = scryfallCard!.id;
                  onSearchResultsRef.current?.([cardWithDistance]);
                  updateStatus("scanning");
                }
                needsCardRemovalRef.current = true;
              } else {
                playDingSound();
                updateStatus("no-match");
                needsCardRemovalRef.current = true;
              }
            })
            .catch((err) => {
              handleErrorRef.current(
                err instanceof Error ? err.message : "Failed to search card",
              );
            })
            .finally(() => {
              isCapturingRef.current = false;
            });
        } else {
          isCapturingRef.current = false;
          updateStatus("scanning");
        }
      }
    }

    rafRef.current = requestAnimationFrame(detectionLoop);
  }, [updateStatus]);

  const handleForceAddDuplicate = useCallback(() => {
    if (duplicateCard) {
      onSearchResultsRef.current?.([duplicateCard]);
      setDuplicateCard(null);
      updateStatus("scanning");
      // needsCardRemovalRef stays true — user must lift card before next scan
    }
  }, [duplicateCard, updateStatus]);

  const handleForceScan = useCallback(() => {
    const currentStatus = statusRef.current;
    if (
      isCapturingRef.current ||
      (currentStatus !== "scanning" &&
        currentStatus !== "no-match" &&
        currentStatus !== "duplicate")
    )
      return;

    isCapturingRef.current = true;
    updateStatus("searching");
    setDuplicateCard(null);

    const captureCanvas = displayCanvasRef.current;
    const captureResult = lastResultRef.current;

    const cardCanvas =
      captureCanvas && captureResult?.detected && captureResult.contour
        ? extractCardImage(captureCanvas, captureResult.contour)
        : captureCanvas;

    if (!cardCanvas) {
      isCapturingRef.current = false;
      updateStatus("scanning");
      return;
    }

    canvasToBlob(cardCanvas)
      .then((blob) => {
        const formData = new FormData();
        formData.append("image", blob, "card.jpg");
        return Search(formData);
      })
      .then(async (data) => {
        if (data.data) {
          const { data: scryfallCard } = await SearchById(data.data.scryfallId);
          const cardWithDistance: ScryfallCardWithDistance = {
            ...scryfallCard!,
            distance: data.data.distance,
          };
          lastScannedCardIdRef.current = scryfallCard!.id;
          onSearchResultsRef.current?.([cardWithDistance]);
          updateStatus("scanning");
          needsCardRemovalRef.current = true;
        } else {
          playDingSound();
          updateStatus("no-match");
          needsCardRemovalRef.current = true;
        }
      })
      .catch((err) => {
        handleErrorRef.current(
          err instanceof Error ? err.message : "Failed to search card",
        );
      })
      .finally(() => {
        isCapturingRef.current = false;
      });
  }, [updateStatus]);

  const handlePause = useCallback(() => {
    pausedRef.current = true;
    stableCountRef.current = 0;
    setIsStable(false);
    setDuplicateCard(null);
    needsCardRemovalRef.current = false;
    updateStatus("paused");
  }, [updateStatus]);

  const handleResume = useCallback(() => {
    pausedRef.current = false;
    stableCountRef.current = 0;
    setIsStable(false);
    updateStatus("scanning");
  }, [updateStatus]);

  const handleRetryError = useCallback(async () => {
    setErrorMessage("");
    try {
      updateStatus("initializing");
      await loadOpenCv();
      await startCamera();
      rafRef.current = requestAnimationFrame(detectionLoop);
    } catch {
      handleError("Failed to reinitialize scanner");
    }
  }, [startCamera, detectionLoop, handleError, updateStatus]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadOpenCv();
        if (cancelled) return;
        await startCamera();
        if (cancelled) return;
        rafRef.current = requestAnimationFrame(detectionLoop);
      } catch {
        if (!cancelled) {
          handleError("Failed to initialize scanner");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [startCamera, detectionLoop, stopCamera, handleError, updateStatus]);

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
