import type { SyncState, SyncStatus } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { cardImageVectors } from "../db/schema";
import { resolveGameDataSourceUrl } from "./card-search/resolve";
import type { SyncSource, SyncSourceCard } from "./card-search/sync-types";
import { sendDiscordNotification } from "./discord";
import { gundamSyncSource } from "./gundam/sync";
import { lorcanaSyncSource } from "./lorcana/sync";
import { pokemonSyncSource } from "./pokemon/sync";
import { scryfallSyncSource } from "./scryfall/sync";
import { vectorizeImageFromBuffer } from "./vectorize";

export const SYNC_SOURCES: Record<string, SyncSource> = {
  mtg: scryfallSyncSource,
  gundam: gundamSyncSource,
  pokemon: pokemonSyncSource,
  lorcana: lorcanaSyncSource,
};

type SseWriter = (event: string, data: unknown) => void;

let state: SyncState = {
  status: "idle",
  gameKey: "",
  lang: "en",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  logs: [],
};

let cancelFlag = false;
let abortController: AbortController | null = null;
const writers = new Set<SseWriter>();

function addLog(msg: string) {
  state = { ...state, logs: [...state.logs.slice(-199), msg] };
  emit("log", { line: msg });
}

function emit(event: string, data: unknown) {
  for (const writer of writers) {
    try {
      writer(event, data);
    } catch {
      // writer may have disconnected
    }
  }
}

export function getStatus(): SyncState {
  return { ...state, logs: [...state.logs] };
}

export function subscribeSSE(writer: SseWriter): () => void {
  writers.add(writer);
  writer("status", getStatus());
  return () => writers.delete(writer);
}

export function cancelSync(): void {
  if (state.status === "running") {
    cancelFlag = true;
    abortController?.abort();
  }
}

export function startSync(
  orgId: string | undefined,
  gameKey: string,
  lang: string = "en",
): void {
  if (state.status === "running") return;

  const source = SYNC_SOURCES[gameKey];
  if (!source) return;
  if (!source.languages.includes(lang)) return;

  cancelFlag = false;
  abortController = new AbortController();
  state = {
    status: "running",
    gameKey,
    lang,
    total: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
    logs: [],
  };

  emit("status", getStatus());
  runSync(source, lang).catch((err) => {
    state = { ...state, status: "failed" };
    const msg = err instanceof Error ? err.message : String(err);
    addLog(`Fatal error: ${msg}`);
    emit("error", { message: msg });
    if (orgId) {
      void sendDiscordNotification(orgId, {
        title: "Magic Vault — Sync Failed",
        description: `The card database sync job encountered a fatal error.\n\n**Error:** ${msg}`,
        color: 0xed4245,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

const VECTORIZE_CONCURRENCY = parseInt(
  process.env.VECTORIZE_CONCURRENCY ?? "10",
);
const INSERT_BATCH_SIZE = parseInt(
  process.env.SYNC_INSERT_BATCH_SIZE ?? "50",
);

async function runSync(source: SyncSource, lang: string): Promise<void> {
  const baseUrl = await resolveGameDataSourceUrl(
    source.gameKey,
    source.defaultUrl,
  );
  addLog(`Using data source: ${baseUrl}`);

  let cards: Awaited<ReturnType<SyncSource["fetchCards"]>>;
  try {
    cards = await source.fetchCards(
      baseUrl,
      addLog,
      lang,
      abortController?.signal,
    );
  } catch (err) {
    if (cancelFlag) {
      state = { ...state, status: "cancelled" };
      addLog("Sync cancelled by user.");
      emit("done", {
        status: "cancelled" as SyncStatus,
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
      });
      return;
    }
    throw err;
  }
  state = { ...state, total: cards.length };
  emit("status", getStatus());

  addLog(`Loading existing ${source.label} cards from DB...`);

  const existing = await db
    .select({ id: cardImageVectors.scryfallId })
    .from(cardImageVectors)
    .where(eq(cardImageVectors.gameKey, source.gameKey));
  const existingSet = new Set(existing.map((r) => r.id));

  addLog(
    `Found ${existingSet.size} existing ${source.label} cards in DB. Starting vectorization (${VECTORIZE_CONCURRENCY} in parallel)...`,
  );

  let pendingInserts: (typeof cardImageVectors.$inferInsert)[] = [];

  async function flushInserts(force = false): Promise<void> {
    if (pendingInserts.length === 0) return;
    if (!force && pendingInserts.length < INSERT_BATCH_SIZE) return;
    const batch = pendingInserts;
    pendingInserts = [];
    await db.insert(cardImageVectors).values(batch).onConflictDoNothing();
  }

  async function processCard(card: SyncSourceCard): Promise<void> {
    if (!card.imageUrl || existingSet.has(card.id)) {
      state = { ...state, skipped: state.skipped + 1 };
      emit("progress", {
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
        currentCard: card.name,
      });
      return;
    }

    try {
      const imageRes = await fetch(card.imageUrl, {
        headers: source.fetchHeaders,
        signal: abortController?.signal,
      });
      if (!imageRes.ok)
        throw new Error(`Image fetch failed: ${imageRes.status}`);
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      const embedding = await vectorizeImageFromBuffer(buffer);

      pendingInserts.push({
        scryfallId: card.id,
        gameKey: source.gameKey,
        lang,
        name: card.name,
        setCode: card.setCode,
        embedding,
      });
      await flushInserts();

      existingSet.add(card.id);
      state = { ...state, processed: state.processed + 1 };
      addLog(
        `[${state.processed + state.skipped}/${state.total}] ${card.name} (${card.setCode})`,
      );
    } catch (err) {
      state = { ...state, errors: state.errors + 1 };
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${card.name}: ${msg}`);
    }

    emit("progress", {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
      currentCard: card.name,
    });
  }

  let nextIndex = 0;
  let cancelled = false;

  async function worker(): Promise<void> {
    for (;;) {
      if (cancelFlag) {
        cancelled = true;
        return;
      }
      const index = nextIndex++;
      if (index >= cards.length) return;
      await processCard(cards[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(VECTORIZE_CONCURRENCY, cards.length) },
      worker,
    ),
  );

  await flushInserts(true);

  if (cancelled) {
    state = { ...state, status: "cancelled" };
    addLog("Sync cancelled by user.");
    emit("done", {
      status: "cancelled" as SyncStatus,
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    });
    return;
  }

  state = { ...state, status: "completed" };
  addLog(
    `Done. Processed: ${state.processed}, Skipped: ${state.skipped}, Errors: ${state.errors}`,
  );
  emit("done", {
    status: "completed" as SyncStatus,
    processed: state.processed,
    skipped: state.skipped,
    errors: state.errors,
  });
}
