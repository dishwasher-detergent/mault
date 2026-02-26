import type { SyncState, SyncStatus } from "@magic-vault/shared";
import { db } from "../db";
import { cardImageVectors } from "../db/schema";
import { vectorizeImageFromBuffer } from "./vectorize";

type SseWriter = (event: string, data: unknown) => void;

let state: SyncState = {
  status: "idle",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  logs: [],
};

let cancelFlag = false;
const writers = new Set<SseWriter>();

function addLog(msg: string) {
  state = { ...state, logs: [...state.logs.slice(-199), msg] };
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
  }
}

export function startSync(): void {
  if (state.status === "running") return;

  cancelFlag = false;
  state = {
    status: "running",
    total: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
    logs: [],
  };

  emit("status", getStatus());
  runSync().catch((err) => {
    state = { ...state, status: "failed" };
    const msg = err instanceof Error ? err.message : String(err);
    addLog(`Fatal error: ${msg}`);
    emit("error", { message: msg });
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ScryfallBulkCard = {
  id: string;
  name: string;
  set: string;
  image_uris?: { large?: string };
};

async function runSync(): Promise<void> {
  addLog("Fetching Scryfall bulk data catalog...");
  emit("status", getStatus());

  const catalogRes = await fetch("https://api.scryfall.com/bulk-data");
  if (!catalogRes.ok) {
    throw new Error(`Scryfall catalog fetch failed: ${catalogRes.status}`);
  }
  const catalog = (await catalogRes.json()) as {
    data: { type: string; download_uri: string }[];
  };

  const artEntry = catalog.data.find((e) => e.type === "unique_artwork");
  if (!artEntry) throw new Error("Could not find unique_artwork bulk data entry");

  addLog(`Downloading bulk artwork data...`);
  emit("status", getStatus());

  const bulkRes = await fetch(artEntry.download_uri);
  if (!bulkRes.ok) throw new Error(`Bulk data download failed: ${bulkRes.status}`);

  const cards = (await bulkRes.json()) as ScryfallBulkCard[];
  state = { ...state, total: cards.length };

  addLog(`Downloaded ${cards.length} cards. Loading existing IDs from DB...`);
  emit("status", getStatus());

  const existing = await db
    .select({ scryfallId: cardImageVectors.scryfallId })
    .from(cardImageVectors);
  const existingSet = new Set(existing.map((r) => r.scryfallId));

  addLog(
    `Found ${existingSet.size} existing cards in DB. Starting vectorization...`,
  );
  emit("status", getStatus());

  for (const card of cards) {
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

    const imageUrl = card.image_uris?.large;
    if (!imageUrl || existingSet.has(card.id)) {
      state = { ...state, skipped: state.skipped + 1 };
      emit("progress", {
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
        currentCard: card.name,
      });
      continue;
    }

    try {
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status}`);
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      const embedding = await vectorizeImageFromBuffer(buffer);

      await db
        .insert(cardImageVectors)
        .values({ scryfallId: card.id, name: card.name, setCode: card.set, embedding })
        .onConflictDoNothing();

      existingSet.add(card.id);
      state = { ...state, processed: state.processed + 1 };
      addLog(
        `[${state.processed + state.skipped}/${state.total}] ${card.name} (${card.set})`,
      );
      emit("progress", {
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
        currentCard: card.name,
      });

      await sleep(100);
    } catch (err) {
      state = { ...state, errors: state.errors + 1 };
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${card.name}: ${msg}`);
      emit("progress", {
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
        currentCard: card.name,
      });
    }
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
