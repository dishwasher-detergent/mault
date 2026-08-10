import { count, eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { db } from "../db";
import { cardImageVectors } from "../db/schema";
import { resolveGameDataSourceUrl } from "../lib/card-search/resolve";
import {
  cancelSync,
  getStatus,
  startSync,
  subscribeSSE,
  SYNC_SOURCES,
} from "../lib/sync-job";
import { vectorizeImageFromBuffer } from "../lib/vectorize";
import {
  requireAuth,
  requireRole,
  verifyToken,
  type AppEnv,
} from "../middleware/auth";

const router = new Hono<AppEnv>();

// GET /admin/sync/stream — SSE, auth via ?token= query param (must be before GET /admin/sync)
router.get("/sync/stream", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  return streamSSE(c, async (stream) => {
    const unsubscribe = subscribeSSE((event, data) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    });

    await new Promise<void>((resolve) => {
      stream.onAbort(resolve);
    });

    unsubscribe();
  });
});

// GET /admin/sync — status is visible to any authenticated user; only
// admins can start/cancel a sync (see POST/DELETE below)
router.get("/sync", requireAuth, (c) => {
  return c.json({ success: true, data: getStatus() });
});

// GET /admin/sync/sources — which games can be synced
router.get("/sync/sources", requireAuth, requireRole("admin"), (c) => {
  const sources = Object.values(SYNC_SOURCES).map((s) => ({
    gameKey: s.gameKey,
    label: s.label,
    languages: s.languages,
  }));
  return c.json({ success: true, data: sources });
});

// POST /admin/sync
router.post("/sync", requireAuth, requireRole("admin"), async (c) => {
  let gameKey: string | undefined;
  let lang = "en";
  try {
    const body = await c.req.json<{ gameKey?: string; lang?: string }>();
    gameKey = body.gameKey;
    if (body.lang) lang = body.lang;
  } catch {
    // no/invalid body
  }

  if (!gameKey) {
    return c.json({ success: false, message: "gameKey is required." }, 400);
  }
  const source = SYNC_SOURCES[gameKey];
  if (!source) {
    return c.json(
      { success: false, message: `Unknown sync source: ${gameKey}` },
      400,
    );
  }
  if (!source.languages.includes(lang)) {
    return c.json(
      {
        success: false,
        message: `${source.label} does not support language: ${lang}`,
      },
      400,
    );
  }

  startSync(c.req.header("X-Org-Id"), gameKey, lang);
  return c.json({ success: true, data: getStatus() });
});

// DELETE /admin/sync
router.delete("/sync", requireAuth, requireRole("admin"), (c) => {
  cancelSync();
  return c.json({ success: true, data: getStatus() });
});

// GET /admin/cards — paginated card list with optional search
router.get("/cards", requireAuth, requireRole("admin"), async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 50)));
  const search = (c.req.query("search") ?? "").trim();
  const offset = (page - 1) * limit;
  const where = search
    ? ilike(cardImageVectors.name, `%${search}%`)
    : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: cardImageVectors.id,
        scryfallId: cardImageVectors.scryfallId,
        gameKey: cardImageVectors.gameKey,
        lang: cardImageVectors.lang,
        name: cardImageVectors.name,
        setCode: cardImageVectors.setCode,
        updatedAt: cardImageVectors.updatedAt,
      })
      .from(cardImageVectors)
      .where(where)
      .orderBy(cardImageVectors.name)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(cardImageVectors).where(where),
  ]);

  return c.json({ success: true, data: { cards: rows, total, page, limit } });
});

// Fetches a single card by id from its source, vectorizes its image, and
// upserts it into the card database — used to both add a missing card and
// to re-vectorize an existing one.
async function syncOneCard(
  gameKey: string,
  scryfallId: string,
  lang: string,
): Promise<
  | { success: true; message: string }
  | { success: false; message: string; status: 400 | 404 | 502 }
> {
  const source = SYNC_SOURCES[gameKey];
  if (!source) {
    return {
      success: false,
      message: `Unknown sync source: ${gameKey}`,
      status: 400,
    };
  }
  const baseUrl = await resolveGameDataSourceUrl(gameKey, source.defaultUrl);

  const card = await source.fetchOne(scryfallId, baseUrl);
  if (!card) {
    return {
      success: false,
      message: `Card not found via ${source.label}`,
      status: 404,
    };
  }
  if (!card.imageUrl) {
    return {
      success: false,
      message: "No image available for this card",
      status: 400,
    };
  }

  const imageRes = await fetch(card.imageUrl, { headers: source.fetchHeaders });
  if (!imageRes.ok) {
    return {
      success: false,
      message: "Failed to download card image",
      status: 502,
    };
  }
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const embedding = await vectorizeImageFromBuffer(buffer);

  await db
    .insert(cardImageVectors)
    .values({
      scryfallId,
      gameKey,
      lang,
      name: card.name,
      setCode: card.setCode,
      embedding,
    })
    .onConflictDoUpdate({
      target: cardImageVectors.scryfallId,
      set: { gameKey, lang, name: card.name, setCode: card.setCode, embedding, updatedAt: new Date() },
    });

  return { success: true, message: `Synced: ${card.name}` };
}

// POST /admin/cards/sync — fetch + vectorize a single card by id, adding it
// to the database if it isn't already there
router.post("/cards/sync", requireAuth, requireRole("admin"), async (c) => {
  let gameKey: string | undefined;
  let scryfallId: string | undefined;
  let lang = "en";
  try {
    const body = await c.req.json<{
      gameKey?: string;
      scryfallId?: string;
      lang?: string;
    }>();
    gameKey = body.gameKey;
    scryfallId = body.scryfallId?.trim();
    if (body.lang) lang = body.lang;
  } catch {
    // no/invalid body
  }

  if (!gameKey || !scryfallId) {
    return c.json(
      { success: false, message: "gameKey and scryfallId are required." },
      400,
    );
  }

  const result = await syncOneCard(gameKey, scryfallId, lang);
  if (!result.success) {
    return c.json({ success: false, message: result.message }, result.status);
  }
  return c.json({ success: true, message: result.message });
});

// POST /admin/cards/:scryfallId/revectorize — re-fetch image and regenerate embedding
router.post(
  "/cards/:scryfallId/revectorize",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const scryfallId = c.req.param("scryfallId");

    const existing = await db.query.cardImageVectors.findFirst({
      where: (t, { eq }) => eq(t.scryfallId, scryfallId),
      columns: { gameKey: true, lang: true },
    });
    if (!existing) {
      return c.json(
        {
          success: false,
          message: `Card ${scryfallId} not found in database.`,
        },
        404,
      );
    }

    const result = await syncOneCard(existing.gameKey, scryfallId, existing.lang);
    if (!result.success) {
      return c.json({ success: false, message: result.message }, result.status);
    }
    return c.json({
      success: true,
      message: result.message.replace("Synced:", "Re-vectorized:"),
    });
  },
);

// GET /admin/cards/games — distinct game keys currently in the card database, with counts
router.get("/cards/games", requireAuth, requireRole("admin"), async (c) => {
  const rows = await db
    .select({ gameKey: cardImageVectors.gameKey, count: count() })
    .from(cardImageVectors)
    .groupBy(cardImageVectors.gameKey)
    .orderBy(cardImageVectors.gameKey);

  return c.json({ success: true, data: rows });
});

// POST /admin/cards/dump — delete card vectors, either all of them or just one game's
router.post("/cards/dump", requireAuth, requireRole("admin"), async (c) => {
  if (getStatus().status === "running") {
    return c.json(
      { success: false, message: "Cannot dump while sync is running" },
      409,
    );
  }

  let gameKey: string | undefined;
  try {
    const body = await c.req.json<{ gameKey?: string }>();
    if (body.gameKey) gameKey = body.gameKey;
  } catch {
    // no/invalid body - dump everything
  }

  if (gameKey) {
    await db
      .delete(cardImageVectors)
      .where(eq(cardImageVectors.gameKey, gameKey));
    return c.json({ success: true, message: `Cleared "${gameKey}" cards` });
  }

  await db.delete(cardImageVectors);
  return c.json({ success: true, message: "Card database cleared" });
});

export { router as adminRouter };
