import type { ScryfallCardWithDistance } from "@/interfaces/scryfall.interface";

export interface Point {
  x: number;
  y: number;
}

export interface CardContour {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface DetectionResult {
  detected: boolean;
  contour: CardContour | null;
  confidence: number;
}

export type ScannerStatus =
  | "initializing"
  | "requesting-camera"
  | "scanning"
  | "paused"
  | "captured"
  | "duplicate"
  | "no-match"
  | "searching"
  | "error";

export interface CardScannerProps {
  onSearchResults?: (matches: ScryfallCardWithDistance[]) => void;
  onManualAdd?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface CardMatch {
  id: number;
  scryfallId: string;
  distance: number;
}

export interface ScannedCard {
  scanId: string;
  card: ScryfallCardWithDistance;
  scannedAt: number;
  binNumber?: number;
  binLabel?: string;
}
