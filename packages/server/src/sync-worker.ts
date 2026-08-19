import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { cardImageVectors } from "./db/schema";
import type { SyncSourceCard } from "./lib/card-search/sync-types";
import { SYNC_SOURCES } from "./lib/sync-sources";
import type { SyncWorkerMessage } from "./lib/sync-worker-messages";
import { vectorizeImageFromBuffer } from "./lib/vectorize";

const [gameKey, lang = "en"] = process.argv.slice(2);
const source = gameKey ? SYNC_SOURCES[gameKey] : undefined;

function send(message: SyncWorkerMessage): void {
  process.send?.(message);
}

function sendFinal(message: SyncWorkerMessage): void {
  if (!process.send) {
    process.exit(0);
    return;
  }
  process.send(message, () => process.exit(0));
}

function addLog(msg: string): void {
  send({ type: "log", line: msg });
}

let cancelFlag = false;
const abortController = new AbortController();

process.on("message", (msg: unknown) => {
  if (msg === "cancel") {
    cancelFlag = true;
    abortController.abort();
  }
});

const VECTORIZE_CONCURRENCY = parseInt(
  process.env.VECTORIZE_CONCURRENCY ?? "10",
  10,
);
const INSERT_BATCH_SIZE = parseInt(
  process.env.SYNC_INSERT_BATCH_SIZE ?? "50",
  10,
);
const FETCH_TIMEOUT_MS = parseInt(
  process.env.SYNC_FETCH_TIMEOUT_MS ?? "20000",
  10,
);

function fetchSignal(): AbortSignal {
  return AbortSignal.any([
    abortController.signal,
    AbortSignal.timeout(FETCH_TIMEOUT_MS),
  ]);
}

async function main(): Promise<void> {
  if (!source) {
    sendFinal({ type: "fatal", message: `Unknown sync source: ${gameKey}` });
    return;
  }
  const activeSource = source;

  const baseUrl = activeSource.defaultUrl;
  addLog(`Using data source: ${baseUrl}`);

  let cards: SyncSourceCard[];
  try {
    cards = await activeSource.fetchCards(
      baseUrl,
      addLog,
      lang,
      abortController.signal,
    );
  } catch (err) {
    if (cancelFlag) {
      addLog("Sync cancelled by user.");
      sendFinal({
        type: "done",
        status: "cancelled",
        processed: 0,
        skipped: 0,
        errors: 0,
      });
      return;
    }
    throw err;
  }

  send({ type: "total", total: cards.length });

  addLog(`Loading existing ${activeSource.label} cards from DB...`);
  const existing = await db
    .select({ id: cardImageVectors.scryfallId })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, activeSource.gameKey),
        eq(cardImageVectors.lang, lang),
      ),
    );
  const existingSet = new Set(existing.map((r) => r.id));

  addLog(
    `Found ${existingSet.size} existing ${activeSource.label} cards in DB. Starting vectorization (${VECTORIZE_CONCURRENCY} in parallel)...`,
  );

  type PendingInsert = {
    card: SyncSourceCard;
    row: typeof cardImageVectors.$inferInsert;
  };

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let queued = 0;
  let pendingInserts: PendingInsert[] = [];

  function emitProgress(currentCard?: string): void {
    send({ type: "progress", processed, skipped, errors, currentCard });
  }

  // A batch insert is one Postgres statement — errors are all-or-nothing.
  // On failure, narrow down which row(s) are actually bad by bisecting the
  // batch and retrying each half, recursing only into halves that still
  // fail. Most of the batch still lands via one or two statements; only the
  // genuinely bad row(s) end up isolated down to an individual insert.
  async function insertBatch(batch: PendingInsert[]): Promise<void> {
    if (batch.length === 0) return;

    try {
      await db
        .insert(cardImageVectors)
        .values(batch.map((b) => b.row))
        .onConflictDoNothing();
      for (const { card } of batch) existingSet.add(card.id);
      processed += batch.length;
      if (batch.length > 1) {
        addLog(`Saved batch of ${batch.length} cards to the database.`);
      }
    } catch (err) {
      if (batch.length === 1) {
        errors++;
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`Error: failed to save ${batch[0].card.name}: ${msg}`);
        return;
      }
      const mid = Math.ceil(batch.length / 2);
      await insertBatch(batch.slice(0, mid));
      await insertBatch(batch.slice(mid));
    }
  }

  async function flushInserts(force = false): Promise<void> {
    if (pendingInserts.length === 0) return;
    if (!force && pendingInserts.length < INSERT_BATCH_SIZE) return;
    const batch = pendingInserts;
    pendingInserts = [];

    const seen = new Set<string>();
    const deduped: PendingInsert[] = [];
    for (const item of batch) {
      if (seen.has(item.row.scryfallId)) continue;
      seen.add(item.row.scryfallId);
      deduped.push(item);
    }
    if (deduped.length < batch.length) {
      const dupeCount = batch.length - deduped.length;
      skipped += dupeCount;
      addLog(
        `Skipped ${dupeCount} duplicate card(s) queued in the same batch.`,
      );
    }

    await insertBatch(deduped);
    emitProgress(batch[batch.length - 1]?.card.name);
  }

  async function processCard(card: SyncSourceCard): Promise<void> {
    if (!card.imageUrl || existingSet.has(card.id)) {
      skipped++;
      emitProgress(card.name);
      return;
    }

    try {
      const imageRes = await fetch(card.imageUrl, {
        headers: activeSource.fetchHeaders,
        signal: fetchSignal(),
      });
      if (!imageRes.ok)
        throw new Error(`Image fetch failed: ${imageRes.status}`);
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      const embedding = await vectorizeImageFromBuffer(buffer);

      pendingInserts.push({
        card,
        row: {
          scryfallId: card.id,
          gameKey: activeSource.gameKey,
          lang,
          name: card.name,
          setCode: card.setCode,
          embedding,
        },
      });
      queued++;
      addLog(
        `[${queued + skipped}/${cards.length}] ${card.name} (${card.setCode}) vectorized, queued for save...`,
      );
      await flushInserts();
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${card.name}: ${msg}`);
      emitProgress(card.name);
    }
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
    addLog("Sync cancelled by user.");
    sendFinal({
      type: "done",
      status: "cancelled",
      processed,
      skipped,
      errors,
    });
    return;
  }

  addLog(
    `Done. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`,
  );
  sendFinal({ type: "done", status: "completed", processed, skipped, errors });
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  sendFinal({ type: "fatal", message: msg });
});
