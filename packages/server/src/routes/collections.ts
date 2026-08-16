import type {
  Collection,
  FieldMeta,
  PlayingCardWithDistance,
  ScannedCard,
} from "@magic-vault/shared";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { authQuery, db, type Transaction } from "../db";
import { collectionCards, collections, games, orgSettings } from "../db/schema";
import { buildCardScannedEmbed, sendDiscordNotification } from "../lib/discord";
import {
  acquireLock,
  getLocksForGuids,
  releaseLock,
  subscribeOrgLocks,
} from "../lib/scan-lock";
import {
  emitToOrg,
  emitToSession,
  getAllSessionViewers,
  getLiveCountsForGuids,
  getSessionViewers,
  subscribeOrgLiveCounts,
  subscribeSession,
} from "../lib/session-stream";
import {
  getUserDisplayName,
  requireAuth,
  requireOrg,
  verifyToken,
  type AppEnv,
} from "../middleware/auth";

const router = new Hono<AppEnv>();

function toCollection(row: {
  guid: string | null;
  name: string;
  isActive: boolean;
  cardCount: string | number;
  lang: string;
  createdAt: Date;
  updatedAt: Date;
  gameGuid: string | null;
  gameKey: string | null;
  gameName: string | null;
  gameDataSourceUrl: string | null;
  gameIsActive: boolean | null;
  gameFieldDefinitions: unknown;
  gameCreatedAt: Date | null;
  gameUpdatedAt: Date | null;
}): Collection {
  return {
    guid: row.guid!,
    name: row.name,
    isActive: row.isActive,
    cardCount: Number(row.cardCount),
    lang: row.lang,
    game: row.gameGuid
      ? {
          guid: row.gameGuid,
          key: row.gameKey!,
          name: row.gameName!,
          dataSourceUrl: row.gameDataSourceUrl!,
          isActive: row.gameIsActive!,
          fieldDefinitions: row.gameFieldDefinitions as FieldMeta[],
          createdAt: row.gameCreatedAt!,
          updatedAt: row.gameUpdatedAt!,
        }
      : null,
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
  alternativeMatches?: unknown;
}): ScannedCard {
  return {
    scanId: row.guid!,
    card: row.card as PlayingCardWithDistance,
    scannedAt: row.scannedAt.getTime(),
    binNumber: row.binNumber ?? undefined,
    capturedImageUrl: row.capturedImageDataUrl ?? undefined,
    isFoil: row.isFoil ?? undefined,
    isDownloaded: row.isDownloaded ?? undefined,
    alternativeMatches:
      (row.alternativeMatches as PlayingCardWithDistance[] | null) ?? undefined,
  };
}

async function _loadCollections(
  tx: Transaction,
  orgId: string,
): Promise<{ success: true; data: Collection[] }> {
  const rows = await tx
    .select({
      id: collections.id,
      guid: collections.guid,
      name: collections.name,
      isActive: collections.isActive,
      cardCount: count(collectionCards.id),
      lang: collections.lang,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      gameGuid: games.guid,
      gameKey: games.key,
      gameName: games.name,
      gameDataSourceUrl: games.dataSourceUrl,
      gameIsActive: games.isActive,
      gameFieldDefinitions: games.fieldDefinitions,
      gameCreatedAt: games.createdAt,
      gameUpdatedAt: games.updatedAt,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(eq(collections.orgId, orgId))
    .groupBy(
      collections.id,
      collections.guid,
      collections.name,
      collections.isActive,
      collections.lang,
      collections.createdAt,
      collections.updatedAt,
      games.id,
    )
    .orderBy(desc(collections.updatedAt));

  return { success: true, data: rows.map(toCollection) };
}

router.get("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const result = await authQuery(c.get("jwtClaims"), (tx) =>
      _loadCollections(tx, orgId),
    );
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

  if (!token || !orgId)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const rows = await db.execute<{ role: string }>(
    sql`SELECT role FROM neon_auth.member WHERE "organizationId" = ${orgId} AND "userId" = ${payload.sub} LIMIT 1`,
  );
  if (!rows.rows[0])
    return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));

    const unsubscribe = subscribeOrgLocks(orgId, (event, data) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    });

    try {
      const guids = await authQuery(jwtClaims, async (tx) =>
        tx
          .select({ guid: collections.guid })
          .from(collections)
          .where(eq(collections.orgId, orgId)),
      );
      const initial = getLocksForGuids(
        guids.map((r) => r.guid!).filter(Boolean),
      );
      await stream.writeSSE({
        event: "init",
        data: JSON.stringify({ locks: initial }),
      });
    } catch {}

    await aborted;
    unsubscribe();
  });
});

// GET /collections/locks — returns { [guid]: ScanLock } for collections currently locked by a scanner
router.get("/locks", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const guids = await authQuery(c.get("jwtClaims"), async (tx) =>
      tx
        .select({ guid: collections.guid })
        .from(collections)
        .where(eq(collections.orgId, orgId)),
    );
    const data = getLocksForGuids(guids.map((r) => r.guid!).filter(Boolean));
    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /collections/live-events — SSE stream of live viewer-count changes for all org collections
router.get("/live-events", async (c) => {
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");

  if (!token || !orgId)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const rows = await db.execute<{ role: string }>(
    sql`SELECT role FROM neon_auth.member WHERE "organizationId" = ${orgId} AND "userId" = ${payload.sub} LIMIT 1`,
  );
  if (!rows.rows[0])
    return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));

    const unsubscribe = subscribeOrgLiveCounts(orgId, (event, data) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    });

    try {
      const guids = await authQuery(jwtClaims, async (tx) =>
        tx
          .select({ guid: collections.guid })
          .from(collections)
          .where(eq(collections.orgId, orgId)),
      );
      const initial = getLiveCountsForGuids(
        guids.map((r) => r.guid!).filter(Boolean),
      );
      await stream.writeSSE({
        event: "init",
        data: JSON.stringify({
          counts: initial,
          viewers: getAllSessionViewers(),
        }),
      });
    } catch {}

    await aborted;
    unsubscribe();
  });
});

// POST /collections — create and activate
router.post("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { name, gameGuid, lang } = await c.req.json<{
    name: string;
    gameGuid?: string;
    lang?: string;
  }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      let gameId: number | null = null;
      if (gameGuid) {
        const game = await tx.query.games.findFirst({
          where: (t, { eq }) => eq(t.guid, gameGuid),
          columns: { id: true },
        });
        gameId = game?.id ?? null;
      }

      await tx
        .update(collections)
        .set({ isActive: false })
        .where(
          and(eq(collections.isActive, true), eq(collections.orgId, orgId)),
        );

      await tx
        .insert(collections)
        .values({ name, isActive: true, orgId, gameId, lang: lang || "en" });

      return _loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", {});
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:guid", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  const { name } = await c.req.json<{ name: string }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true },
      });
      if (!target) return { success: false, message: "Collection not found." };
      await tx
        .update(collections)
        .set({ name, updatedAt: new Date() })
        .where(eq(collections.id, target.id));
      return _loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", { guid });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:guid/active", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true },
      });
      if (!target) return { success: false, message: "Collection not found." };

      await tx
        .update(collections)
        .set({ isActive: false })
        .where(
          and(eq(collections.isActive, true), eq(collections.orgId, orgId)),
        );
      await tx
        .update(collections)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(collections.id, target.id));

      return _loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", { guid });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:guid", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true, isActive: true },
      });
      if (!target) return { success: false, message: "Collection not found." };

      // cascade deletes collectionCards via FK
      await tx.delete(collections).where(eq(collections.id, target.id));

      // if we deleted the active one, activate the most recent remaining
      if (target.isActive) {
        const next = await tx.query.collections.findFirst({
          where: (t, { eq }) => eq(t.orgId, orgId),
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

      return _loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", { guid });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.get("/:guid/cards", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true },
      });
      if (!collection)
        return { success: false, message: "Collection not found." };

      const rows = await tx
        .select({
          guid: collectionCards.guid,
          card: collectionCards.card,
          scannedAt: collectionCards.scannedAt,
          binNumber: collectionCards.binNumber,
          capturedImageDataUrl: collectionCards.capturedImageDataUrl,
          isFoil: collectionCards.isFoil,
          isDownloaded: collectionCards.isDownloaded,
          alternativeMatches: collectionCards.alternativeMatches,
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

router.post("/:guid/cards", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const {
    scanId,
    card,
    scannedAt,
    binNumber,
    capturedImageUrl,
    isFoil,
    alternativeMatches,
  } = await c.req.json<ScannedCard>();

  const displayName = await getUserDisplayName(userId);
  if (!acquireLock(guid, userId, orgId, displayName)) {
    return c.json(
      {
        success: false,
        message:
          "Another org member is currently scanning into this collection.",
      },
      423,
    );
  }

  type AddCardResult =
    | { success: true; data: ScannedCard }
    | { success: false; message: string };

  try {
    const { result, collectionName, gameName } = await authQuery<{
      result: AddCardResult;
      collectionName: string | undefined;
      gameName: string | undefined;
    }>(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true, gameId: true, name: true },
      });
      if (!collection)
        return {
          result: { success: false, message: "Collection not found." },
          collectionName: undefined,
          gameName: undefined,
        };

      await tx
        .insert(collectionCards)
        .values({
          guid: scanId,
          collectionId: collection.id,
          scryfallId: (card as PlayingCardWithDistance).id,
          card,
          scannedAt: new Date(scannedAt),
          binNumber: binNumber ?? null,
          capturedImageDataUrl: capturedImageUrl ?? null,
          isFoil: isFoil ?? false,
          alternativeMatches: alternativeMatches?.length
            ? alternativeMatches
            : null,
          orgId,
        })
        .onConflictDoNothing();

      await tx
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, collection.id));

      const game = collection.gameId
        ? await tx.query.games.findFirst({
            where: (t, { eq }) => eq(t.id, collection.gameId!),
            columns: { name: true },
          })
        : null;

      return {
        result: {
          success: true,
          data: {
            scanId,
            card,
            scannedAt,
            binNumber,
            capturedImageUrl,
            isFoil,
            alternativeMatches,
          } as ScannedCard,
        },
        collectionName: collection.name,
        gameName: game?.name,
      };
    });
    if (result.success) {
      emitToSession(guid, "card_added", result.data);
      emitToOrg(orgId, "collections_changed", { guid });

      db.query.orgSettings
        .findFirst({
          where: eq(orgSettings.orgId, orgId),
          columns: { discordNotifyOnScan: true },
        })
        .then((row) => {
          if (row?.discordNotifyOnScan) {
            void sendDiscordNotification(
              orgId,
              buildCardScannedEmbed(card as PlayingCardWithDistance, {
                isFoil,
                collectionName,
                gameName,
                collectionGuid: guid,
              }),
            );
          }
        })
        .catch((err) => {
          console.error("[discord] Failed to check discordNotifyOnScan:", err);
        });
    }
    return c.json(result);
  } catch (err) {
    console.error(err);
    emitToSession(guid, "scan_error", {
      message: "Failed to save card to collection.",
      timestamp: Date.now(),
    });
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /collections/:guid/cards/:scanId — update card (correction and/or foil status)
router.put("/:guid/cards/:scanId", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { guid, scanId } = c.req.param();
  const { card, binNumber, isFoil } = await c.req.json<{
    card?: PlayingCardWithDistance;
    binNumber?: number;
    isFoil?: boolean;
  }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const existing = await tx.query.collectionCards.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, scanId), eq(t.orgId, orgId)),
        columns: {
          id: true,
          scannedAt: true,
          card: true,
          binNumber: true,
          isFoil: true,
        },
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
          card: (card ?? existing.card) as PlayingCardWithDistance,
          scannedAt: existing.scannedAt,
          binNumber:
            card !== undefined ? (binNumber ?? null) : existing.binNumber,
          isFoil: isFoil !== undefined ? isFoil : existing.isFoil,
        }),
      };
    });
    if (result.success) emitToSession(guid, "card_updated", result.data);
    return c.json(result);
  } catch (err) {
    console.error(err);
    emitToSession(guid, "scan_error", {
      message: "Failed to update card.",
      timestamp: Date.now(),
    });
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:guid/cards", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true },
      });
      if (!collection)
        return { success: false, message: "Collection not found." };

      await tx
        .delete(collectionCards)
        .where(eq(collectionCards.collectionId, collection.id));

      return { success: true, data: null };
    });
    if (result.success) {
      emitToSession(guid, "cards_cleared", {});
      emitToOrg(orgId, "collections_changed", { guid });
    }
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/:guid/cards/remove-bulk", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  const { scanIds } = await c.req.json<{ scanIds: string[] }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      for (const scanId of scanIds) {
        await tx
          .delete(collectionCards)
          .where(
            and(
              eq(collectionCards.guid, scanId),
              eq(collectionCards.orgId, orgId),
            ),
          );
      }
      return { success: true, data: null };
    });
    if (result.success) {
      emitToSession(guid, "cards_removed", { scanIds });
      emitToOrg(orgId, "collections_changed", { guid });
    }
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post(
  "/:guid/cards/mark-downloaded",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { scanIds } = await c.req.json<{ scanIds: string[] }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        for (const scanId of scanIds) {
          await tx
            .update(collectionCards)
            .set({ isDownloaded: true })
            .where(
              and(
                eq(collectionCards.guid, scanId),
                eq(collectionCards.orgId, orgId),
              ),
            );
        }
        return { success: true, data: null };
      });
      if (result.success) emitToSession(guid, "cards_downloaded", { scanIds });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);

router.delete("/:guid/cards/:scanId", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { guid, scanId } = c.req.param();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .delete(collectionCards)
        .where(
          and(
            eq(collectionCards.guid, scanId),
            eq(collectionCards.orgId, orgId),
          ),
        );
      return { success: true, data: null };
    });
    if (result.success) {
      emitToSession(guid, "card_removed", { scanId });
      emitToOrg(orgId, "collections_changed", { guid });
    }
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:guid/scan-lock", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const userId = c.get("userId");
  releaseLock(guid, userId); // emits lock_released to org subscribers internally
  return c.json({ success: true, data: null });
});

// POST /collections/:guid/debug/error — emit a test scan_error to session watchers (admin only)
router.post("/:guid/debug/error", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  emitToSession(guid, "scan_error", {
    message: "Debug: forced error triggered.",
    timestamp: Date.now(),
  });
  return c.json({ success: true, data: null });
});

// GET /collections/:guid/stream — SSE, auth via ?token= and ?orgId= query params
router.get("/:guid/stream", async (c) => {
  const guid = c.req.param("guid");
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");

  if (!token || !orgId)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const rows = await db.execute<{ role: string }>(
    sql`SELECT role FROM neon_auth.member WHERE "organizationId" = ${orgId} AND "userId" = ${payload.sub} LIMIT 1`,
  );
  if (!rows.rows[0])
    return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  const viewerDisplayName = await getUserDisplayName(payload.sub);

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));

    const writer = (event: string, data: unknown) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    };

    const unsubscribe = subscribeSession(
      guid,
      orgId,
      payload.sub!,
      viewerDisplayName,
      writer,
    );

    try {
      const initial = await authQuery(jwtClaims, async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: {
            id: true,
            guid: true,
            name: true,
            isActive: true,
            gameId: true,
            lang: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (!collection) return null;

        const game = collection.gameId
          ? await tx.query.games.findFirst({
              where: (t, { eq }) => eq(t.id, collection.gameId!),
            })
          : null;

        const cardRows = await tx
          .select({
            guid: collectionCards.guid,
            card: collectionCards.card,
            scannedAt: collectionCards.scannedAt,
            binNumber: collectionCards.binNumber,
            capturedImageDataUrl: collectionCards.capturedImageDataUrl,
            isFoil: collectionCards.isFoil,
            isDownloaded: collectionCards.isDownloaded,
            alternativeMatches: collectionCards.alternativeMatches,
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
            lang: collection.lang,
            game: game
              ? {
                  guid: game.guid!,
                  key: game.key,
                  name: game.name,
                  dataSourceUrl: game.dataSourceUrl,
                  isActive: game.isActive,
                  fieldDefinitions: game.fieldDefinitions as FieldMeta[],
                  createdAt: game.createdAt,
                  updatedAt: game.updatedAt,
                }
              : null,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
          } satisfies Collection,
          cards: cardRows.map(toScannedCard),
          viewers: getSessionViewers(guid),
        };
      });

      if (initial) {
        await stream.writeSSE({
          event: "session_init",
          data: JSON.stringify(initial),
        });
      }
    } catch {
      // non-fatal — subscriber will still receive live events
    }

    await aborted;

    unsubscribe();
  });
});

export { router as collectionsRouter };
