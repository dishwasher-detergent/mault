import { searchByImage } from "@/features/cards/api/card";
import { getCardById } from "@/features/cards/api/card-search";
import { useCollections } from "@/features/collections/api/use-collections";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { SCANNABLE_STATUSES } from "@/features/scanner/constants";
import {
  canvasToBlob,
  drawDetectionOverlay,
  extractCardImage,
  getDefaultCardContour,
} from "@/features/scanner/lib/card-detection";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_SCAN_REGION,
  type CardContour,
  type CardScannerProps,
  type PlayingCardWithDistance,
  type ScanRegion,
  type ScannerStatus,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// Singleton AudioContext - browsers cap concurrent contexts (~6).
// Creating one per scan exhausts the limit quickly.
let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
}

function playDingSound() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();

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
}

const CLOSE_MATCH_DELTA = 0.05;

async function searchCardImage(
  canvas: HTMLCanvasElement,
  contour?: CardContour | null,
  collectionGuid?: string,
): Promise<{
  card: PlayingCardWithDistance | null;
  alternativeMatches: PlayingCardWithDistance[];
  debugImageUrl: string;
}> {
  const warpedCanvas = contour ? extractCardImage(canvas, contour) : canvas;
  const debugImageUrl = warpedCanvas.toDataURL("image/jpeg", 0.8);
  const blob = await canvasToBlob(warpedCanvas);
  const formData = new FormData();
  formData.append("image", blob, "card.jpg");
  if (collectionGuid) formData.append("collectionGuid", collectionGuid);

  const { data } = await searchByImage(formData);
  if (!data || data.length === 0)
    return { card: null, alternativeMatches: [], debugImageUrl };

  const closeMatches = data.filter(
    (m) => m.distance - data[0].distance <= CLOSE_MATCH_DELTA,
  );
  const resolved = await Promise.all(
    closeMatches.map((m) =>
      getCardById(m.cardId, collectionGuid).then((r) =>
        r.data ? { ...r.data, distance: m.distance } : null,
      ),
    ),
  );

  const cards = resolved.filter(Boolean) as PlayingCardWithDistance[];
  if (cards.length === 0)
    return { card: null, alternativeMatches: [], debugImageUrl };

  const [card, ...alternativeMatches] = cards;
  return { card, alternativeMatches, debugImageUrl };
}

export function useCardScanner({
  onSearchResults,
  onNoMatch,
  onError,
  rotated = true,
  scanRegion: scanRegionProp,
}: Omit<CardScannerProps, "className"> & {
  rotated?: boolean;
  scanRegion?: ScanRegion;
} = {}) {
  const { t } = useTranslation("scanner");
  const {
    stream,
    status: cameraStatus,
    errorMessage: cameraError,
    zoom,
    zoomRange,
    cameras,
    selectedCameraId,
    setZoom,
    selectCamera,
    retryCamera,
    stopCamera,
  } = useCameraContext();
  const { activeCollection } = useCollections();
  const { activeOrg } = useOrg();
  const { data: orgSettingsData } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );

  const rotatedRef = useRef(rotated);
  rotatedRef.current = rotated;

  const scanRegion =
    scanRegionProp ?? orgSettingsData?.scanRegion ?? DEFAULT_SCAN_REGION;
  const scanRegionRef = useRef(scanRegion);
  scanRegionRef.current = scanRegion;

  const captureSettleDelayMs =
    orgSettingsData?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS;
  const captureSettleDelayMsRef = useRef(captureSettleDelayMs);
  captureSettleDelayMsRef.current = captureSettleDelayMs;

  const activeCollectionGuidRef = useRef(activeCollection?.guid);
  activeCollectionGuidRef.current = activeCollection?.guid;

  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const statusRef = useRef<ScannerStatus>("initializing");
  const lastScannedCardIdRef = useRef<string | null>(null);
  const isCapturingRef = useRef(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchResultsRef = useRef(onSearchResults);
  const onNoMatchRef = useRef(onNoMatch);
  const handleErrorRef = useRef<(msg: string) => void>(() => {});

  const [status, setStatus] = useState<ScannerStatus>("initializing");
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicateCard, setDuplicateCard] =
    useState<PlayingCardWithDistance | null>(null);
  const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);
  const debugImageUrlRef = useRef<string | null>(null);
  const [allowDuplicates, setAllowDuplicates] = useState(true);

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

  useEffect(() => {
    onSearchResultsRef.current = onSearchResults;
  }, [onSearchResults]);

  useEffect(() => {
    onNoMatchRef.current = onNoMatch;
  }, [onNoMatch]);

  useEffect(() => {
    handleErrorRef.current = handleError;
  }, [handleError]);

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
        const { card, alternativeMatches, debugImageUrl } =
          await searchCardImage(
            canvas,
            contour,
            activeCollectionGuidRef.current,
          );
        setDebugImageUrl(debugImageUrl);
        debugImageUrlRef.current = debugImageUrl;

        if (card) {
          if (
            checkDuplicate &&
            !allowDuplicates &&
            lastScannedCardIdRef.current === card.id
          ) {
            setDuplicateCard(card);
            updateStatus("duplicate");
          } else {
            lastScannedCardIdRef.current = card.id;
            onSearchResultsRef.current?.(
              [card, ...alternativeMatches],
              debugImageUrl,
            );
            updateStatus("scanning");
          }
        } else {
          playDingSound();
          onNoMatchRef.current?.();
          updateStatus("no-match");
        }
      } catch (err) {
        handleErrorRef.current(
          err instanceof Error ? err.message : t("scanEngine.searchFailed"),
        );
      } finally {
        isCapturingRef.current = false;
      }
    },
    [updateStatus, allowDuplicates, t],
  );

  // Draws the live camera feed to the display canvas every frame. Capture is
  // no longer triggered from here - see `captureCard`, which fires off the
  // module 1 IR sensor confirming a card has arrived (via the feeder command
  // round trip), not from continuously polling the frame for a card shape.
  const detectionLoop = useCallback(() => {
    const video = videoRef.current;
    const displayCanvas = displayCanvasRef.current;

    if (!video || !displayCanvas) return;
    if (video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(detectionLoop);
      return;
    }

    const displayCtx = displayCanvas.getContext("2d");
    if (!displayCtx) return;

    displayCtx.drawImage(video, 0, 0);

    rafRef.current = requestAnimationFrame(detectionLoop);
  }, []);

  // Attach stream to video/canvases and start the detection loop.
  // Re-runs if the stream is replaced (e.g. after retryCamera).
  // On unmount: cancels the RAF loop but does NOT stop the stream tracks -
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

        const { videoWidth, videoHeight } = video;
        for (const ref of [displayCanvasRef, overlayCanvasRef]) {
          if (ref.current) {
            ref.current.width = videoWidth;
            ref.current.height = videoHeight;
          }
        }

        const overlayCtx = overlayCanvasRef.current?.getContext("2d");
        if (overlayCtx) {
          overlayCtx.clearRect(0, 0, videoWidth, videoHeight);
          drawDetectionOverlay(overlayCtx, {
            detected: true,
            contour: getDefaultCardContour(
              videoWidth,
              videoHeight,
              scanRegionRef.current,
            ),
            confidence: 1,
          });
        }

        const container = displayCanvasRef.current?.parentElement;
        if (container) {
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const scale = rotatedRef.current
            ? Math.max(cw / videoHeight, ch / videoWidth)
            : Math.max(cw / videoWidth, ch / videoHeight);
          const cssW = Math.round(videoWidth * scale);
          const cssH = Math.round(videoHeight * scale);
          for (const ref of [displayCanvasRef, overlayCanvasRef]) {
            if (ref.current) {
              ref.current.style.width = `${cssW}px`;
              ref.current.style.height = `${cssH}px`;
              ref.current.style.left = `${(cw - cssW) / 2}px`;
              ref.current.style.top = `${(ch - cssH) / 2}px`;
            }
          }
        }

        updateStatus("paused");
        rafRef.current = requestAnimationFrame(detectionLoop);
      } catch (err) {
        if (!cancelled) {
          handleErrorRef.current(
            err instanceof Error ? err.message : t("scanEngine.videoStartFailed"),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
        isCapturingRef.current = false;
      }
      video.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  useEffect(() => {
    const canvas = displayCanvasRef.current;
    const overlayCtx = overlayCanvasRef.current?.getContext("2d");
    if (!canvas || !overlayCtx || !canvas.width || !canvas.height) return;
    overlayCtx.clearRect(0, 0, canvas.width, canvas.height);
    drawDetectionOverlay(overlayCtx, {
      detected: true,
      contour: getDefaultCardContour(canvas.width, canvas.height, scanRegion),
      confidence: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanRegion.coverage, scanRegion.offsetX, scanRegion.offsetY]);

  const handleForceAddDuplicate = useCallback(() => {
    if (duplicateCard) {
      onSearchResultsRef.current?.(
        [duplicateCard],
        debugImageUrlRef.current ?? undefined,
      );
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

    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    isCapturingRef.current = true;
    updateStatus("searching");
    setDuplicateCard(null);
    performCapture(
      false,
      getDefaultCardContour(canvas.width, canvas.height, scanRegionRef.current),
    );
  }, [updateStatus, performCapture]);

  const captureCard = useCallback(() => {
    if (
      isCapturingRef.current ||
      !SCANNABLE_STATUSES.includes(statusRef.current)
    )
      return;

    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    isCapturingRef.current = true;
    updateStatus("searching");
    const contour = getDefaultCardContour(
      canvas.width,
      canvas.height,
      scanRegionRef.current,
    );
    settleTimeoutRef.current = setTimeout(() => {
      settleTimeoutRef.current = null;
      performCapture(true, contour);
    }, captureSettleDelayMsRef.current);
  }, [updateStatus, performCapture]);

  const handleSkipDuplicate = useCallback(() => {
    setDuplicateCard(null);
    updateStatus("scanning");
  }, [updateStatus]);

  const handlePause = useCallback(() => {
    setDuplicateCard(null);
    updateStatus("paused");
  }, [updateStatus]);

  const handleResume = useCallback(() => {
    updateStatus("scanning");
  }, [updateStatus]);

  const handleRetryError = useCallback(async () => {
    setErrorMessage("");
    try {
      await retryCamera();
    } catch {
      handleErrorRef.current(t("scanEngine.cameraReinitFailed"));
    }
  }, [retryCamera, t]);

  return {
    status,
    errorMessage,
    duplicateCard,
    debugImageUrl,
    videoRef,
    displayCanvasRef,
    overlayCanvasRef,
    captureCard,
    handleForceAddDuplicate,
    handleForceScan,
    handleSkipDuplicate,
    handlePause,
    handleResume,
    handleRetryError,
    handleStopCamera: stopCamera,
    isCameraActive: cameraStatus === "ready",
    zoom,
    zoomRange,
    cameras,
    selectedCameraId,
    setZoom,
    selectCamera,
    allowDuplicates,
    setAllowDuplicates,
  };
}
