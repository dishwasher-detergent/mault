import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { requireAuth, requireRole, verifyToken, getUserRole, type AppEnv } from "../middleware/auth";
import { cancelSync, getStatus, startSync, subscribeSSE } from "../lib/sync-job";
import { db } from "../db";
import { cardImageVectors } from "../db/schema";
import { count, ilike } from "drizzle-orm";
import { vectorizeImageFromBuffer } from "../lib/vectorize";

const router = new Hono<AppEnv>();

// GET /admin/sync/stream — SSE, auth via ?token= query param (must be before GET /admin/sync)
router.get("/sync/stream", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub) return c.json({ success: false, message: "Unauthorized" }, 401);
  const role = await getUserRole(payload.sub);
  if (role !== "admin") return c.json({ success: false, message: "Forbidden" }, 403);

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

// GET /admin/sync
router.get("/sync", requireAuth, requireRole("admin"), (c) => {
  return c.json({ success: true, data: getStatus() });
});

// POST /admin/sync
router.post("/sync", requireAuth, requireRole("admin"), (c) => {
  startSync();
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
  const where = search ? ilike(cardImageVectors.name, `%${search}%`) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: cardImageVectors.id,
        scryfallId: cardImageVectors.scryfallId,
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

// POST /admin/cards/:scryfallId/revectorize — re-fetch image and regenerate embedding
router.post("/cards/:scryfallId/revectorize", requireAuth, requireRole("admin"), async (c) => {
  const scryfallId = c.req.param("scryfallId");

  const scryfallRes = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
  if (!scryfallRes.ok) {
    return c.json({ success: false, message: "Card not found on Scryfall" }, 404);
  }
  const card = (await scryfallRes.json()) as {
    name: string;
    set: string;
    image_uris?: { png?: string; large?: string };
  };

  const imageUrl = card.image_uris?.png ?? card.image_uris?.large;
  if (!imageUrl) {
    return c.json({ success: false, message: "No image available for this card" }, 400);
  }

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    return c.json({ success: false, message: "Failed to download card image" }, 502);
  }
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const embedding = await vectorizeImageFromBuffer(buffer);

  await db
    .insert(cardImageVectors)
    .values({ scryfallId, name: card.name, setCode: card.set, embedding })
    .onConflictDoUpdate({
      target: cardImageVectors.scryfallId,
      set: { embedding, updatedAt: new Date() },
    });

  return c.json({ success: true, message: `Re-vectorized: ${card.name}` });
});

// POST /admin/cards/dump — delete all card vectors
router.post("/cards/dump", requireAuth, requireRole("admin"), async (c) => {
  if (getStatus().status === "running") {
    return c.json({ success: false, message: "Cannot dump while sync is running" }, 409);
  }

  await db.delete(cardImageVectors);
  return c.json({ success: true, message: "Card database cleared" });
});

export { router as adminRouter };
