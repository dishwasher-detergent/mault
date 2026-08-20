import type { PlayingCardWithDistance } from "@magic-vault/shared";

export interface DebugCardSet {
  mockCards: PlayingCardWithDistance[];
  multiMatch: {
    card: PlayingCardWithDistance;
    imageUrl: string;
    alternates: PlayingCardWithDistance[];
  };
}

export function proxiedImageUrl(url: string): string {
  return `/api/cards/image-proxy?url=${encodeURIComponent(url)}`;
}
