import { MTG_ASPECT_RATIO } from "@/features/scanner/constants";
import type { CardContour, DetectionResult, Point } from "@magic-vault/shared";

/**
 * Order four points clockwise: topLeft, topRight, bottomRight, bottomLeft.
 * Uses the sum (x+y) and difference (y-x) method.
 */
function orderPoints(pts: Point[]): CardContour {
  const sorted = [...pts];

  // Sum: smallest = topLeft, largest = bottomRight
  sorted.sort((a, b) => a.x + a.y - (b.x + b.y));
  const topLeft = sorted[0];
  const bottomRight = sorted[3];

  // Difference (y - x): smallest = topRight, largest = bottomLeft
  sorted.sort((a, b) => a.y - a.x - (b.y - b.x));
  const topRight = sorted[0];
  const bottomLeft = sorted[3];

  return { topLeft, topRight, bottomRight, bottomLeft };
}

/**
 * Sample the median pixel value from a grayscale Mat (used for auto-Canny).
 */
function medianPixelValue(mat: cv.Mat): number {
  const data = mat.data as Uint8Array;
  const step = Math.max(1, Math.floor(data.length / 1000));
  const sample: number[] = [];
  for (let i = 0; i < data.length; i += step) sample.push(data[i]);
  sample.sort((a, b) => a - b);
  return sample[Math.floor(sample.length / 2)];
}

/**
 * Score a quadrilateral by aspect ratio, area, and side symmetry.
 */
function scoreContour(contour: CardContour, frameArea: number): number {
  const { topLeft, topRight, bottomRight, bottomLeft } = contour;

  const widthTop    = Math.hypot(topRight.x - topLeft.x,     topRight.y - topLeft.y);
  const widthBottom = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
  const heightLeft  = Math.hypot(bottomLeft.x - topLeft.x,   bottomLeft.y - topLeft.y);
  const heightRight = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y);

  const avgWidth  = (widthTop + widthBottom) / 2;
  const avgHeight = (heightLeft + heightRight) / 2;

  if (avgHeight === 0 || avgWidth === 0) return 0;

  // How close to the MTG card aspect ratio
  const aspectRatio = avgWidth / avgHeight;
  const aspectScore = 1 - Math.abs(aspectRatio - MTG_ASPECT_RATIO) / MTG_ASPECT_RATIO;

  // Prefer cards that fill a meaningful portion of the frame
  const area = avgWidth * avgHeight;
  const areaScore = Math.min((area / frameArea) * 4, 1);

  // Opposite sides should be roughly the same length (parallelogram check)
  const widthSym  = 1 - Math.abs(widthTop - widthBottom)   / Math.max(widthTop, widthBottom, 1);
  const heightSym = 1 - Math.abs(heightLeft - heightRight) / Math.max(heightLeft, heightRight, 1);
  const symmetryScore = (widthSym + heightSym) / 2;

  return Math.max(0, aspectScore * 0.6 + areaScore * 0.2 + symmetryScore * 0.2);
}

// Processing width for detection — scale down for speed and noise reduction.
// Points are scaled back up to original coordinates before returning.
const PROC_WIDTH = 640;

/**
 * Detect an MTG card in an ImageData frame using OpenCV.js contour detection.
 */
export function detectCard(imageData: ImageData): DetectionResult {
  const noDetection: DetectionResult = { detected: false, contour: null, confidence: 0 };

  const scale  = PROC_WIDTH / imageData.width;
  const procH  = Math.round(imageData.height * scale);
  const frameArea = PROC_WIDTH * procH;
  const minArea   = frameArea * 0.05;
  const maxArea   = frameArea * 0.95;

  const src      = cv.matFromImageData(imageData);
  const scaled   = new cv.Mat();
  const gray     = new cv.Mat();
  const blurred  = new cv.Mat();
  const edges    = new cv.Mat();
  const morphed  = new cv.Mat();
  const hierarchy = new cv.Mat();
  const contours  = new cv.MatVector();
  let kernel: cv.Mat | null = null;

  try {
    // Scale down — dramatically reduces noise and speeds up processing
    cv.resize(src, scaled, new cv.Size(PROC_WIDTH, procH));

    cv.cvtColor(scaled, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Auto-calibrate Canny thresholds from the image's median brightness
    const median = medianPixelValue(blurred);
    const sigma  = 0.33;
    const lower  = Math.max(0,   Math.round((1 - sigma) * median));
    const upper  = Math.min(255, Math.round((1 + sigma) * median));
    cv.Canny(blurred, edges, lower, upper);

    // Morphological close: 2× dilate then erode bridges edge gaps better than dilate alone
    kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.dilate(edges, morphed, kernel, new cv.Point(-1, -1), 2);
    cv.erode(morphed, morphed, kernel, new cv.Point(-1, -1), 1);

    cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestResult: DetectionResult = noDetection;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area    = cv.contourArea(contour);
      if (area < minArea || area > maxArea) continue;

      const perimeter = cv.arcLength(contour, true);
      let approx: cv.Mat | null = null;

      try {
        // Try progressively larger epsilons until we get a quadrilateral
        for (const eps of [0.02, 0.03, 0.04, 0.06]) {
          const candidate = new cv.Mat();
          cv.approxPolyDP(contour, candidate, eps * perimeter, true);
          if (candidate.rows === 4) {
            approx = candidate;
            break;
          }
          candidate.delete();
        }

        if (!approx) continue;

        // Cards are convex — skip anything that isn't
        if (!cv.isContourConvex(approx)) continue;

        // Scale points back to original image coordinates
        const points: Point[] = [];
        for (let j = 0; j < 4; j++) {
          points.push({
            x: approx.data32S[j * 2]     / scale,
            y: approx.data32S[j * 2 + 1] / scale,
          });
        }

        const ordered    = orderPoints(points);
        const confidence = scoreContour(ordered, imageData.width * imageData.height);

        if (confidence > bestResult.confidence && confidence > 0.35) {
          bestResult = { detected: true, contour: ordered, confidence };
        }
      } finally {
        approx?.delete();
      }
    }

    return bestResult;
  } finally {
    src.delete();
    scaled.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    morphed.delete();
    hierarchy.delete();
    contours.delete();
    kernel?.delete();
  }
}

/**
 * Extract and perspective-warp the detected card region from a canvas.
 */
export function extractCardImage(
  sourceCanvas: HTMLCanvasElement,
  contour: CardContour,
  outputWidth = 745,
): HTMLCanvasElement {
  const outputHeight = Math.round(outputWidth / MTG_ASPECT_RATIO);

  const ctx = sourceCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const imageData = ctx.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  );
  const src = cv.matFromImageData(imageData);
  const dst = new cv.Mat();

  // Source points (from detected contour)
  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    contour.topLeft.x,
    contour.topLeft.y,
    contour.topRight.x,
    contour.topRight.y,
    contour.bottomRight.x,
    contour.bottomRight.y,
    contour.bottomLeft.x,
    contour.bottomLeft.y,
  ]);

  // Destination points (output rectangle)
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    outputWidth,
    0,
    outputWidth,
    outputHeight,
    0,
    outputHeight,
  ]);

  let transformMatrix: cv.Mat | null = null;

  let enhanced: cv.Mat | null = null;

  try {
    transformMatrix = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(
      src,
      dst,
      transformMatrix,
      new cv.Size(outputWidth, outputHeight),
    );

    // Boost brightness and contrast for better embedding matching
    // dst(i) = saturate(alpha * src(i) + beta)
    enhanced = new cv.Mat();
    dst.convertTo(enhanced, -1, 1.15, 20);

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;
    cv.imshow(outputCanvas, enhanced);

    return outputCanvas;
  } finally {
    src.delete();
    dst.delete();
    srcPts.delete();
    dstPts.delete();
    transformMatrix?.delete();
    enhanced?.delete();
  }
}

/**
 * Scan row-wise vertical gradients to find the y-position of a strong
 * horizontal edge within a vertical band [yMinFrac, yMaxFrac].
 * Returns the row index and its gradient score.
 */
function findEdgeRow(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  yMinFrac: number,
  yMaxFrac: number,
): { row: number; score: number } {
  const xLeft  = Math.floor(width * 0.10);
  const xRight = Math.floor(width * 0.90);
  const span   = xRight - xLeft;
  const yMin   = Math.floor(height * yMinFrac);
  const yMax   = Math.floor(height * yMaxFrac);

  let bestRow = Math.floor(height * ((yMinFrac + yMaxFrac) / 2));
  let bestScore = 0;

  for (let y = yMin; y < yMax && y + 1 < height; y++) {
    let sum = 0;
    for (let x = xLeft; x < xRight; x++) {
      const i = (y * width + x) * 4;
      const j = ((y + 1) * width + x) * 4;
      sum +=
        (Math.abs(data[i]     - data[j])     +
         Math.abs(data[i + 1] - data[j + 1]) +
         Math.abs(data[i + 2] - data[j + 2])) / 3;
    }
    const score = sum / span;
    if (score > bestScore) { bestScore = score; bestRow = y; }
  }

  return { row: bestRow, score: bestScore };
}

/**
 * Detect the art region within a warped card canvas.
 *
 * Regular cards have a strong horizontal edge at the type-line separator
 * (~45–65% of card height). Full-art cards lack this edge, so we fall back
 * to treating almost the entire card face as art.
 */
function detectArtBounds(canvas: HTMLCanvasElement): {
  top: number;
  left: number;
  bottom: number;
  right: number;
} {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { top: 0.12, left: 0.06, bottom: 0.57, right: 0.94 };

  const { data } = ctx.getImageData(0, 0, W, H);

  // Look for the type-line bar that separates art from the text box
  const typeLine = findEdgeRow(data, W, H, 0.45, 0.65);

  // No strong separator → full-art card
  if (typeLine.score < 15) {
    return { top: 0.03, left: 0.03, bottom: 0.97, right: 0.97 };
  }

  // Find the name-bar bottom edge to set the art top boundary
  const nameBar = findEdgeRow(data, W, H, 0.08, 0.16);

  return {
    top:    nameBar.row / H,
    left:   0.06,
    bottom: typeLine.row / H,
    right:  0.94,
  };
}

/**
 * Extract just the art region from a perspective-warped card canvas.
 * Automatically handles both regular and full-art cards.
 */
export function extractArtRegion(warpedCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const W = warpedCanvas.width;
  const H = warpedCanvas.height;
  const { top, left, bottom, right } = detectArtBounds(warpedCanvas);

  const artLeft   = Math.floor(left   * W);
  const artTop    = Math.floor(top    * H);
  const artRight  = Math.floor(right  * W);
  const artBottom = Math.floor(bottom * H);
  const artW = artRight  - artLeft;
  const artH = artBottom - artTop;

  const artCanvas = document.createElement("canvas");
  artCanvas.width  = artW;
  artCanvas.height = artH;
  artCanvas.getContext("2d")!.drawImage(
    warpedCanvas,
    artLeft, artTop, artW, artH,
    0, 0, artW, artH,
  );
  return artCanvas;
}

/**
 * Convert a canvas to a JPEG blob for upload.
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality = 0.95,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob from canvas"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Draw the detection overlay (rounded quadrilateral border) on a canvas context.
 * Uses the CSS --primary color from the page.
 */
export function drawDetectionOverlay(
  ctx: CanvasRenderingContext2D,
  result: DetectionResult,
): void {
  if (!result.detected || !result.contour) return;

  const { topLeft, topRight, bottomRight, bottomLeft } = result.contour;
  const corners = [topLeft, topRight, bottomRight, bottomLeft];

  // Read the --primary CSS variable and convert to a usable color
  const primaryRaw = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  const color = primaryRaw ? `${primaryRaw}` : "#6d28d9";

  const lineWidth = 6;
  const radius = 16;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Draw a rounded polygon using arcTo at each corner
  ctx.beginPath();
  for (let i = 0; i < corners.length; i++) {
    const prev = corners[(i - 1 + corners.length) % corners.length];
    const curr = corners[i];
    const next = corners[(i + 1) % corners.length];

    if (i === 0) {
      // Start midpoint between prev and curr
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.moveTo(mx, my);
    }

    ctx.arcTo(curr.x, curr.y, next.x, next.y, radius);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}
