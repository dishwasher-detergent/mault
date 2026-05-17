import type { ScryfallCard, ScryfallImageUris } from "./interfaces/scryfall.interface";

/** Returns image URIs for a card, falling back to the front face for double-faced cards. */
export function getCardImageUris(card: ScryfallCard): ScryfallImageUris | undefined {
  return card.image_uris ?? card.card_faces?.[0]?.image_uris;
}

/** Returns the display name — front face name only for DFCs (e.g. "Delver of Secrets"). */
export function getCardFaceName(card: ScryfallCard): string {
  return card.card_faces?.[0]?.name ?? card.name;
}
