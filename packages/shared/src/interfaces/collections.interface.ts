import type { ScannedCard } from "./scanner.interface";

export interface Collection {
  guid: string;
  name: string;
  isActive: boolean;
  cardCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionWithCards extends Collection {
  cards: ScannedCard[];
}
