import type { FieldMeta } from "./sort-bins.interface";

export interface Game {
  guid: string;
  key: string;
  name: string;
  isActive: boolean;
  fieldDefinitions: FieldMeta[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicGame {
  key: string;
  name: string;
}

export interface GameCoverage {
  guid: string;
  key: string;
  name: string;
  isActive: boolean;
  cardCount: number;
  languages: string[];
  lastUpdated: string | null;
}
