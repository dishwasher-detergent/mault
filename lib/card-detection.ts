import type {
	CardContour,
	DetectionResult,
	Point,
} from "@/interfaces/scanner.interface";
import { getCv } from "@/lib/opencv-loader";

const MTG_ASPECT_RATIO = 2.5 / 3.5; // ~0.714

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
 * Score a quadrilateral by how close its aspect ratio is to an MTG card.
 */
function scoreContour(contour: CardContour, frameArea: number): number {
	const { topLeft, topRight, bottomRight, bottomLeft } = contour;

	const widthTop = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
	const widthBottom = Math.hypot(
		bottomRight.x - bottomLeft.x,
		bottomRight.y - bottomLeft.y,
	);
	const heightLeft = Math.hypot(
		bottomLeft.x - topLeft.x,
		bottomLeft.y - topLeft.y,
	);
	const heightRight = Math.hypot(
		bottomRight.x - topRight.x,
		bottomRight.y - topRight.y,
	);

	const avgWidth = (widthTop + widthBottom) / 2;
	const avgHeight = (heightLeft + heightRight) / 2;

	if (avgHeight === 0) return 0;

	const aspectRatio = avgWidth / avgHeight;
	const aspectScore =
		1 - Math.abs(aspectRatio - MTG_ASPECT_RATIO) / MTG_ASPECT_RATIO;

	const area = avgWidth * avgHeight;
	const areaRatio = area / frameArea;
	const areaScore = Math.min(areaRatio * 5, 1); // Prefer larger cards

	return Math.max(0, aspectScore * 0.7 + areaScore * 0.3);
}

/**
 * Detect an MTG card in an ImageData frame using OpenCV.js contour detection.
 */
export function detectCard(imageData: ImageData): DetectionResult {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const cv: any = getCv();
	const noDetection: DetectionResult = {
		detected: false,
		contour: null,
		confidence: 0,
	};

	const frameArea = imageData.width * imageData.height;
	const minArea = frameArea * 0.05;
	const maxArea = frameArea * 0.95;

	const src = cv.matFromImageData(imageData);
	const gray = new cv.Mat();
	const blurred = new cv.Mat();
	const edges = new cv.Mat();
	const dilated = new cv.Mat();
	const hierarchy = new cv.Mat();
	const contours = new cv.MatVector();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let kernel: any = null;

	try {
		// Grayscale
		cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

		// Gaussian blur
		cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

		// Canny edge detection
		cv.Canny(blurred, edges, 50, 150);

		// Dilate to close gaps
		kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
		cv.dilate(edges, dilated, kernel);

		// Find external contours
		cv.findContours(
			dilated,
			contours,
			hierarchy,
			cv.RETR_EXTERNAL,
			cv.CHAIN_APPROX_SIMPLE,
		);

		let bestResult: DetectionResult = noDetection;

		for (let i = 0; i < contours.size(); i++) {
			const contour = contours.get(i);
			const area = cv.contourArea(contour);

			if (area < minArea || area > maxArea) continue;

			const perimeter = cv.arcLength(contour, true);
			const approx = new cv.Mat();

			try {
				cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

				// Must be a quadrilateral
				if (approx.rows !== 4) continue;

				const points: Point[] = [];
				for (let j = 0; j < 4; j++) {
					points.push({
						x: approx.data32S[j * 2],
						y: approx.data32S[j * 2 + 1],
					});
				}

				const ordered = orderPoints(points);
				const confidence = scoreContour(ordered, frameArea);

				if (confidence > bestResult.confidence && confidence > 0.3) {
					bestResult = {
						detected: true,
						contour: ordered,
						confidence,
					};
				}
			} finally {
				approx.delete();
			}
		}

		return bestResult;
	} finally {
		src.delete();
		gray.delete();
		blurred.delete();
		edges.delete();
		dilated.delete();
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const cv: any = getCv();
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let transformMatrix: any = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let enhanced: any = null;

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
