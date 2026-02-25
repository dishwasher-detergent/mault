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
