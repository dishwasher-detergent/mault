import type {
  ScannerStatus,
  ScannedCard,
  ScryfallCard,
  ScryfallCardWithDistance,
} from "@magic-vault/shared";

export type CameraStatus = "idle" | "requesting" | "ready" | "error";

export interface CameraContextValue {
  stream: MediaStream | null;
  status: CameraStatus;
  errorMessage: string;
  retryCamera: () => Promise<void>;
}

export interface ScannedCardsContextValue {
  cards: ScannedCard[];
  isLoading: boolean;
  addCard: (card: ScryfallCardWithDistance) => void;
  sendCatchAllBin: () => void;
  removeCard: (scanId: string) => void;
  correctCard: (scanId: string, card: ScryfallCard) => void;
  clearCards: () => void;
}

export type SerialMessageListener = (message: unknown) => void;

export interface SerialContextValue {
  isConnected: boolean;
  isReady: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendBin: (binNumber: number) => Promise<unknown | null>;
  sendTest: () => Promise<boolean>;
  sendCommand: (data: string) => Promise<boolean>;
  subscribe: (listener: SerialMessageListener) => () => void;
}

export interface ScannerControlsProps {
  status: ScannerStatus;
  duplicateCardName?: string;
  onForceAddDuplicate: () => void;
  onForceScan: () => void;
  onPause: () => void;
  onResume: () => void;
  disabled?: boolean;
}

export interface ScannerOverlayProps {
  status: ScannerStatus;
  errorMessage: string;
  isConnected: boolean;
  isReady: boolean;
  hasCatchAll: boolean;
  onRetryError: () => void;
}

export interface SetStats {
  code: string;
  name: string;
  count: number;
  value: number;
}
