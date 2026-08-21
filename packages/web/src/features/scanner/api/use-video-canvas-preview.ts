import {
  drawDetectionOverlay,
  getDefaultCardContour,
} from "@/features/scanner/lib/card-detection";
import type { ScanRegion } from "@magic-vault/shared";
import { useEffect, useRef } from "react";

// Draws live video frames onto a canvas with the calibrated scan-region box
// overlaid on top - same visual approach as the desktop scanner
// (api/use-card-scanner.ts's stream-attach effect + detectionLoop), but
// standalone: no capture, no identification, just "show where the scan
// region is" so a camera (in this case a phone) can be aimed/positioned
// correctly. Always drawn in the source's native orientation (no rotation) -
// unlike the desktop's external, sideways-mounted webcam, a phone's own
// camera already reports frames right-side up for however it's being held.
export function useVideoCanvasPreview(
  stream: MediaStream | null,
  scanRegion: ScanRegion,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const scanRegionRef = useRef(scanRegion);
  scanRegionRef.current = scanRegion;

  useEffect(() => {
    if (!stream) return;

    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;

    const drawOverlay = () => {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !canvas.width || !canvas.height) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawDetectionOverlay(ctx, {
        detected: true,
        contour: getDefaultCardContour(
          canvas.width,
          canvas.height,
          scanRegionRef.current,
        ),
        confidence: 1,
      });
    };

    const detectionLoop = () => {
      const displayCanvas = displayCanvasRef.current;
      const displayCtx = displayCanvas?.getContext("2d");
      if (
        displayCanvas &&
        displayCtx &&
        video.readyState >= video.HAVE_ENOUGH_DATA
      ) {
        displayCtx.drawImage(video, 0, 0);
      }
      rafRef.current = requestAnimationFrame(detectionLoop);
    };

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

        const container = displayCanvasRef.current?.parentElement;
        if (container) {
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const scale = Math.max(cw / videoWidth, ch / videoHeight);
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

        drawOverlay();
        rafRef.current = requestAnimationFrame(detectionLoop);
      } catch {}
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      video.srcObject = null;
    };
  }, [stream]);

  // Redraw the box if the calibrated region changes while streaming.
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !canvas.width || !canvas.height) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawDetectionOverlay(ctx, {
      detected: true,
      contour: getDefaultCardContour(canvas.width, canvas.height, scanRegion),
      confidence: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanRegion.coverage, scanRegion.offsetX, scanRegion.offsetY]);

  return { videoRef, displayCanvasRef, overlayCanvasRef };
}
