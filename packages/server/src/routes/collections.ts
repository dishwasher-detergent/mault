import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { count, desc, eq, sql } from "drizzle-orm";
import { authQuery, db, type Transaction } from "../db";
import { collections, collectionCards } from "../db/schema";
import { getUserDisplayName, requireAuth, requireOrg, verifyToken, type AppEnv } from "../middleware/auth";
import { emitToSession, getSessionViewers, sessionListenerCount, subscribeSession } from "../lib/session-stream";
import { acquireLock, getLocksForGuids, releaseLock, subscribeOrgLocks } from "../lib/scan-lock";
import type { Collection, ScannedCard, ScryfallCardWithDistance } from "@magic-vault/shared";

const router = new Hono<AppEnv>();

function toCollection(row: {
  id: number;
  guid: string | null;
  name: string;
  isActive: boolean;
  cardCount: string | number;
  createdAt: Date;
  updatedAt: Date;
}): Collection {
  return {
    guid: row.guid!,
    name: row.name,
    isActive: row.isActive,
    cardCount: Number(row.cardCount),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toScannedCard(row: {
  guid: string | null;
  card: unknown;
  scannedAt: Date;
  binNumber: number | null;
  capturedImageDataUrl?: string | null;
  isFoil?: boolean | null;
  isDownloaded?: boolean | null;
}): ScannedCard {
  return {
    scanId: row.guid!,
    card: row.card as ScryfallCardWithDistance,
    scannedAt: row.scannedAt.getTime(),
    binNumber: row.binNumber ?? undefined,
    capturedImageUrl: row.capturedImageDataUrl ?? undefined,
    isFoil: row.isFoil ?? undefined,
    isDownloaded: row.isDownloaded ?? undefined,
  };
}

async function _loadCollections(tx: Transaction): Promise<{ success: true; data: Collection[] }> {
  const rows = await tx
    .select({
      id: collections.id,
      guid: collections.guid,
      name: collections.name,
      isActive: collections.isActive,
      cardCount: count(collectionCards.id),
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .groupBy(
      collections.id,
      collections.guid,
      collections.name,
      collections.isActive,
      collections.createdAt,
      collections.updatedAt,
    )
    .orderBy(desc(collections.updatedAt));

  return { success: true, data: rows.map(toCollection) };
}

// GET /collections
router.get("/", requireAuth, requireOrg, async (c) => {
  try {
    const result = await authQuery(c.get("jwtClaims"), _loadCollections);
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /collections/lock-events — SSE stream of lock_acquired / lock_released for all org collections
router.get("/lock-events", async (c) => {
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");

  if (!token || !orgId) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub) return c.json({ success: false, message: "Unauthorized" }, 401);

  const rows = await db.execute<{ role: string }>(
    sql`SELECT role FROM neon_auth.member WHERE "organizationId" = ${orgId} AND "userId" = ${payload.sub} LIMIT 1`,
  );
  if (!rows.rows[0]) return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  return streamSSE(c, async (stream) => {
    // Send current lock state as initial event
    try {
      const guids = await authQuery(jwtClaims, async (tx) =>
        tx.select({ guid: collections.guid }).from(collections),
      );
      const initial = getLocksForGuids(guids.map((r) => r.guid!).filter(Boolean));
      await stream.writeSSE({ event: "init", data: JSON.stringify({ locks: initial }) });
    } catch { /* non-fatal */ }

    const unsubscribe = subscribeOrgLocks(orgId, (event, data) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    });

    await new Promise<void>((resolve) => { stream.onAbort(resolve); });
    unsubscribe();
  });
});

// GET /collections/locks — returns { [guid]: ScanLock } for collections currently locked by a scanner
router.get("/locks", requireAuth, requireOrg, async (c) => {
  try {
    const guids = await authQuery(c.get("jwtClaims"), async (tx) =>
      tx.select({ guid: collections.guid }).from(collections),
    );
    const data = getLocksForGuids(guids.map((r) => r.guid!).filter(Boolean));
    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /collections/live — returns { [guid]: monitorCount } for sessions with active monitors
router.get("/live", requireAuth, requireOrg, async (c) => {
  try {
    const allCollections = await authQuery(c.get("jwtClaims"), async (tx) => {
      return tx
        .select({ guid: collections.guid })
        .from(collections);
    });

    const live: Record<string, number> = {};
    for (const { guid } of allCollections) {
      if (!guid) continue;
      const n = sessionListenerCount(guid);
      if (n > 0) live[guid] = n;
    }

    return c.json({ success: true, data: live });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /collections/viewers — viewers for all collections { [guid]: ViewerInfo[] }
router.get("/viewers", requireAuth, requireOrg, async (c) => {
  const allCollections = await authQuery(c.get("jwtClaims"), async (tx) =>
    tx.select({ guid: collections.guid }).from(collections),
  );
  const result: Record<string, ReturnType<typeof getSessionViewers>> = {};
  for (const { guid } of allCollections) {
    if (!guid) continue;
    const viewers = getSessionViewers(guid);
    if (viewers.length > 0) result[guid] = viewers;
  }
  return c.json({ success: true, data: result });
});

// GET /collections/:guid/viewers — current session viewers for a collection
router.get("/:guid/viewers", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  return c.json({ success: true, data: getSessionViewers(guid) });
});

// POST /collections — create and activate
router.post("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { name } = await c.req.json<{ name: string }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .update(collections)
        .set({ isActive: false })
        .where(eq(collections.isActive, true));

      await tx.insert(collections).values({ name, isActive: true, orgId });

      return _loadCollections(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /collections/:guid — rename
router.put("/:guid", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const { name } = await c.req.json<{ name: string }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.collections.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { id: true },
      });
      if (!target) return { success: false, message: "Collection not found." };
      await tx
        .update(collections)
        .set({ name, updatedAt: new Date() })
        .where(eq(collections.id, target.id));
      return _loadCollections(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /collections/:guid/active — activate
router.put("/:guid/active", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.collections.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { id: true },
      });
      if (!target) return { success: false, message: "Collection not found." };

      await tx
        .update(collections)
        .set({ isActive: false })
        .where(eq(collections.isActive, true));
      await tx
        .update(collections)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(collections.id, target.id));

      return _loadCollections(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// DELETE /collections/:guid
router.delete("/:guid", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.collections.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { id: true, isActive: true },
      });
      if (!target) return { success: false, message: "Collection not found." };

      // cascade deletes collectionCards via FK
      await tx.delete(collections).where(eq(collections.id, target.id));

      // if we deleted the active one, activate the most recent remaining
      if (target.isActive) {
        const next = await tx.query.collections.findFirst({
          orderBy: (t, { desc }) => [desc(t.updatedAt)],
          columns: { id: true },
        });
        if (next) {
          await tx
            .update(collections)
            .set({ isActive: true })
            .where(eq(collections.id, next.id));
        }
      }

      return _loadCollections(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /collections/:guid/cards
router.get("/:guid/cards", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { id: true },
      });
      if (!collection) return { success: false, message: "Collection not found." };

      const rows = await tx
        .select({
          guid: collectionCards.guid,
          card: collectionCards.card,
          scannedAt: collectionCards.scannedAt,
          binNumber: collectionCards.binNumber,
          capturedImageDataUrl: collectionCards.capturedImageDataUrl,
          isFoil: collectionCards.isFoil,
          isDownloaded: collectionCards.isDownloaded,
        })
        .from(collectionCards)
        .where(eq(collectionCards.collectionId, collection.id))
        .orderBy(desc(collectionCards.scannedAt));

      return { success: true, data: rows.map(toScannedCard) };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// POST /collections/:guid/cards — add card
router.post("/:guid/cards", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const { scanId, card, scannedAt, binNumber, capturedImageUrl, isFoil } = await c.req.json<ScannedCard>();

  const displayName = await getUserDisplayName(userId);
  if (!acquireLock(guid, userId, orgId, displayName)) {
    return c.json({ success: false, message: "Another org member is currently scanning into this collection." }, 423);
  }

  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { id: true },
      });
      if (!collection) return { success: false, message: "Collection not found." };

      await tx.insert(collectionCards).values({
        guid: scanId,
        collectionId: collection.id,
        scryfallId: (card as ScryfallCardWithDistance).id,
        card,
        scannedAt: new Date(scannedAt),
        binNumber: binNumber ?? null,
        capturedImageDataUrl: capturedImageUrl ?? null,
        isFoil: isFoil ?? false,
        orgId,
      }).onConflictDoNothing();

      // bump collection updatedAt
      await tx
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, collection.id));

      return { success: true, data: { scanId, card, scannedAt, binNumber, capturedImageUrl, isFoil } as ScannedCard };
    });
    if (result.success) emitToSession(guid, "card_added", result.data);
    return c.json(result);
  } catch (err) {
    console.error(err);
    emitToSession(guid, "scan_error", { message: "Failed to save card to collection.", timestamp: Date.now() });
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /collections/:guid/cards/:scanId — update card (correction and/or foil status)
router.put("/:guid/cards/:scanId", requireAuth, requireOrg, async (c) => {
  const { guid, scanId } = c.req.param();
  const { card, binNumber, isFoil } = await c.req.json<{
    card?: ScryfallCardWithDistance;
    binNumber?: number;
    isFoil?: boolean;
  }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const existing = await tx.query.collectionCards.findFirst({
        where: (t, { eq }) => eq(t.guid, scanId),
        columns: { id: true, scannedAt: true, card: true, binNumber: true, isFoil: true },
      });
      if (!existing) return { success: false, message: "Card not found." };

      const updates: Partial<typeof collectionCards.$inferInsert> = {};
      if (card !== undefined) {
        updates.card = card;
        updates.scryfallId = card.id;
        updates.binNumber = binNumber ?? null;
      }
      if (isFoil !== undefined) updates.isFoil = isFoil;

      await tx
        .update(collectionCards)
        .set(updates)
        .where(eq(collectionCards.id, existing.id));

      return {
        success: true,
        data: toScannedCard({
          guid: scanId,
          card: (card ?? existing.card) as ScryfallCardWithDistance,
          scannedAt: existing.scannedAt,
          binNumber: card !== undefined ? (binNumber ?? null) : existing.binNumber,
          isFoil: isFoil !== undefined ? isFoil : existing.isFoil,
        }),
      };
    });
    if (result.success) emitToSession(guid, "card_updated", result.data);
    return c.json(result);
  } catch (err) {
    console.error(err);
    emitToSession(guid, "scan_error", { message: "Failed to update card.", timestamp: Date.now() });
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// DELETE /collections/:guid/cards — clear all cards in collection
router.delete("/:guid/cards", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { id: true },
      });
      if (!collection) return { success: false, message: "Collection not found." };

      await tx
        .delete(collectionCards)
        .where(eq(collectionCards.collectionId, collection.id));

      return { success: true, data: null };
    });
    if (result.success) emitToSession(guid, "cards_cleared", {});
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// POST /collections/:guid/cards/remove-bulk — remove multiple cards
router.post("/:guid/cards/remove-bulk", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const { scanIds } = await c.req.json<{ scanIds: string[] }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      for (const scanId of scanIds) {
        await tx
          .delete(collectionCards)
          .where(eq(collectionCards.guid, scanId));
      }
      return { success: true, data: null };
    });
    if (result.success) emitToSession(guid, "cards_removed", { scanIds });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// POST /collections/:guid/cards/mark-downloaded — mark multiple cards as downloaded
router.post("/:guid/cards/mark-downloaded", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const { scanIds } = await c.req.json<{ scanIds: string[] }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      for (const scanId of scanIds) {
        await tx
          .update(collectionCards)
          .set({ isDownloaded: true })
          .where(eq(collectionCards.guid, scanId));
      }
      return { success: true, data: null };
    });
    if (result.success) emitToSession(guid, "cards_downloaded", { scanIds });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// DELETE /collections/:guid/cards/:scanId — remove one card
router.delete("/:guid/cards/:scanId", requireAuth, requireOrg, async (c) => {
  const { guid, scanId } = c.req.param();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx.delete(collectionCards).where(eq(collectionCards.guid, scanId));
      return { success: true, data: null };
    });
    if (result.success) emitToSession(guid, "card_removed", { scanId });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// DELETE /collections/:guid/scan-lock — release scanner lock
router.delete("/:guid/scan-lock", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const userId = c.get("userId");
  releaseLock(guid, userId); // emits lock_released to org subscribers internally
  return c.json({ success: true, data: null });
});

// POST /collections/:guid/debug/error — emit a test scan_error to session watchers (admin only)
router.post("/:guid/debug/error", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  emitToSession(guid, "scan_error", { message: "Debug: forced error triggered.", timestamp: Date.now() });
  return c.json({ success: true, data: null });
});

// GET /collections/:guid/stream — SSE, auth via ?token= and ?orgId= query params
router.get("/:guid/stream", async (c) => {
  const guid = c.req.param("guid");
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");

  if (!token || !orgId) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub) return c.json({ success: false, message: "Unauthorized" }, 401);

  const rows = await db.execute<{ role: string }>(
    sql`SELECT role FROM neon_auth.member WHERE "organizationId" = ${orgId} AND "userId" = ${payload.sub} LIMIT 1`,
  );
  if (!rows.rows[0]) return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  const viewerDisplayName = await getUserDisplayName(payload.sub);

  return streamSSE(c, async (stream) => {
    const writer = (event: string, data: unknown) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    };

    // Subscribe first so viewers_updated includes this viewer
    const unsubscribe = subscribeSession(guid, payload.sub, viewerDisplayName, writer);

    // Send initial state
    try {
      const initial = await authQuery(jwtClaims, async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq }) => eq(t.guid, guid),
          columns: { id: true, guid: true, name: true, isActive: true, createdAt: true, updatedAt: true },
        });
        if (!collection) return null;

        const cardRows = await tx
          .select({
            guid: collectionCards.guid,
            card: collectionCards.card,
            scannedAt: collectionCards.scannedAt,
            binNumber: collectionCards.binNumber,
            capturedImageDataUrl: collectionCards.capturedImageDataUrl,
            isFoil: collectionCards.isFoil,
            isDownloaded: collectionCards.isDownloaded,
          })
          .from(collectionCards)
          .where(eq(collectionCards.collectionId, collection.id))
          .orderBy(desc(collectionCards.scannedAt));

        return {
          collection: {
            guid: collection.guid!,
            name: collection.name,
            isActive: collection.isActive,
            cardCount: cardRows.length,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
          } satisfies Collection,
          cards: cardRows.map(toScannedCard),
          viewers: getSessionViewers(guid),
        };
      });

      if (initial) {
        await stream.writeSSE({ event: "session_init", data: JSON.stringify(initial) });
      }
    } catch {
      // non-fatal — subscriber will still receive live events
    }

    await new Promise<void>((resolve) => {
      stream.onAbort(resolve);
    });

    unsubscribe();
  });
});

export { router as collectionsRouter };
