import { authQuery } from "../../db";
import { gundamAdapter } from "../gundam/search";
import { lorcanaAdapter } from "../lorcana/search";
import { onePieceAdapter } from "../onepiece/search";
import { pokemonAdapter } from "../pokemon/search";
import { scryfallAdapter } from "../scryfall/search";
import { withCache } from "./cache";
import type { CardSearchAdapter } from "./types";

const ADAPTERS_BY_GAME_KEY: Record<string, CardSearchAdapter> = {
  mtg: withCache(scryfallAdapter),
  gundam: withCache(gundamAdapter),
  pokemon: withCache(pokemonAdapter),
  lorcana: withCache(lorcanaAdapter),
  onepiece: withCache(onePieceAdapter),
};

async function findCollectionGame(jwtClaims: string, collectionGuid: string) {
  return authQuery(jwtClaims, async (tx) => {
    const collection = await tx.query.collections.findFirst({
      where: (t, { eq }) => eq(t.guid, collectionGuid),
      columns: { gameId: true },
    });
    if (!collection?.gameId) return null;
    return tx.query.games.findFirst({
      where: (t, { eq }) => eq(t.id, collection.gameId!),
    });
  });
}

export async function resolveGameKeyAndLang(
  jwtClaims: string,
  collectionGuid: string | undefined,
): Promise<{ gameKey: string; lang: string } | null> {
  if (!collectionGuid) return null;
  return authQuery(jwtClaims, async (tx) => {
    const collection = await tx.query.collections.findFirst({
      where: (t, { eq }) => eq(t.guid, collectionGuid),
      columns: { gameId: true, lang: true },
    });
    if (!collection?.gameId) return null;
    const game = await tx.query.games.findFirst({
      where: (t, { eq }) => eq(t.id, collection.gameId!),
      columns: { key: true },
    });
    if (!game) return null;
    return { gameKey: game.key, lang: collection.lang };
  });
}

export async function resolveCardSearch(
  jwtClaims: string,
  collectionGuid: string | undefined,
): Promise<{ adapter: CardSearchAdapter; baseUrl: string } | null> {
  if (!collectionGuid) return null;
  const game = await findCollectionGame(jwtClaims, collectionGuid);
  if (!game) return null;

  const adapter = ADAPTERS_BY_GAME_KEY[game.key];
  if (!adapter) return null;

  return { adapter, baseUrl: adapter.defaultUrl };
}
