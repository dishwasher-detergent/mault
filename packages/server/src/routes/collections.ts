import { Hono } from "hono";
import { authQuery, type Transaction } from "../db";
import { collections, collectionCards } from "../db/schema";
import { requireAuth, type AppEnv } from "../middleware/auth";
import type { Collection, ScannedCard, ScryfallCardWithDistance } from "@magic-vault/shared";
import { count, desc, eq } from "drizzle-orm";

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
}): ScannedCard {
  return {
    scanId: row.guid!,
    card: row.card as ScryfallCardWithDistance,
    scannedAt: row.scannedAt.getTime(),
    binNumber: row.binNumber ?? undefined,
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
router.get("/", requireAuth, async (c) => {
  try {
    const result = await authQuery(c.get("jwtClaims"), _loadCollections);
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// POST /collections — create and activate
router.post("/", requireAuth, async (c) => {
  const { name } = await c.req.json<{ name: string }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .update(collections)
        .set({ isActive: false })
        .where(eq(collections.isActive, true));

      await tx.insert(collections).values({ name, isActive: true });

      return _loadCollections(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /collections/:guid — rename
router.put("/:guid", requireAuth, async (c) => {
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
router.put("/:guid/active", requireAuth, async (c) => {
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
router.delete("/:guid", requireAuth, async (c) => {
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
router.get("/:guid/cards", requireAuth, async (c) => {
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
router.post("/:guid/cards", requireAuth, async (c) => {
  const guid = c.req.param("guid");
  const { scanId, card, scannedAt, binNumber } = await c.req.json<ScannedCard>();
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
      }).onConflictDoNothing();

      // bump collection updatedAt
      await tx
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, collection.id));

      return { success: true, data: { scanId, card, scannedAt, binNumber } as ScannedCard };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /collections/:guid/cards/:scanId — update card (correction)
router.put("/:guid/cards/:scanId", requireAuth, async (c) => {
  const { guid, scanId } = c.req.param();
  const { card, binNumber } = await c.req.json<{ card: ScryfallCardWithDistance; binNumber?: number }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const existing = await tx.query.collectionCards.findFirst({
        where: (t, { eq }) => eq(t.guid, scanId),
        columns: { id: true, scannedAt: true },
      });
      if (!existing) return { success: false, message: "Card not found." };

      await tx
        .update(collectionCards)
        .set({ card, binNumber: binNumber ?? null, scryfallId: card.id })
        .where(eq(collectionCards.id, existing.id));

      return {
        success: true,
        data: toScannedCard({ guid: scanId, card, scannedAt: existing.scannedAt, binNumber: binNumber ?? null }),
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// DELETE /collections/:guid/cards — clear all cards in collection
router.delete("/:guid/cards", requireAuth, async (c) => {
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
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// POST /collections/:guid/cards/remove-bulk — remove multiple cards
router.post("/:guid/cards/remove-bulk", requireAuth, async (c) => {
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
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// DELETE /collections/:guid/cards/:scanId — remove one card
router.delete("/:guid/cards/:scanId", requireAuth, async (c) => {
  const scanId = c.req.param("scanId");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx.delete(collectionCards).where(eq(collectionCards.guid, scanId));
      return { success: true, data: null };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as collectionsRouter };
