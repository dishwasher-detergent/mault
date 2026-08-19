import type { SyncSource } from "./card-search/sync-types";
import { gundamSyncSource } from "./gundam/sync";
import { lorcanaSyncSource } from "./lorcana/sync";
import { onePieceSyncSource } from "./onepiece/sync";
import { pokemonSyncSource } from "./pokemon/sync";
import { scryfallSyncSource } from "./scryfall/sync";

export const SYNC_SOURCES: Record<string, SyncSource> = {
  mtg: scryfallSyncSource,
  gundam: gundamSyncSource,
  pokemon: pokemonSyncSource,
  lorcana: lorcanaSyncSource,
  onepiece: onePieceSyncSource,
};
