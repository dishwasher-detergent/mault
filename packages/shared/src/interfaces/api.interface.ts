import type { ScryfallCard } from "./scryfall.interface";

export interface SearchCardMatch {
  id: string;
  scryfallId: string;
  distance: number;
}

export interface ScryfallListResponse {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
}

export type SyncStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface SyncState {
  status: SyncStatus;
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  startedAt: string | null;
  logs: string[];
}
