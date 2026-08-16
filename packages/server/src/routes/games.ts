import type { FieldMeta, Game } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { cardImageVectors, games } from "../db/schema";
import { requireAuth, requireRole, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

function toGame(row: typeof games.$inferSelect): Game {
  return {
    guid: row.guid!,
    key: row.key,
    name: row.name,
    dataSourceUrl: row.dataSourceUrl,
    isActive: row.isActive,
    fieldDefinitions: row.fieldDefinitions as FieldMeta[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

interface GameInput {
  key: string;
  name: string;
  dataSourceUrl: string;
  fieldDefinitions: FieldMeta[];
  isActive?: boolean;
}

// GET /games — any authenticated user (needed to pick a game per collection)
router.get("/", requireAuth, async (c) => {
  try {
    const rows = await db.select().from(games).orderBy(games.name);
    return c.json({ success: true, data: rows.map(toGame) });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.get("/:guid/languages", requireAuth, async (c) => {
  const guid = c.req.param("guid");
  try {
    const game = await db.query.games.findFirst({
      where: (t, { eq }) => eq(t.guid, guid),
      columns: { key: true },
    });
    if (!game)
      return c.json({ success: false, message: "Game not found." }, 404);

    const rows = await db
      .select({ lang: cardImageVectors.lang })
      .from(cardImageVectors)
      .where(eq(cardImageVectors.gameKey, game.key))
      .groupBy(cardImageVectors.lang)
      .orderBy(cardImageVectors.lang);

    return c.json({ success: true, data: rows?.map((r) => r.lang) ?? [] });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/", requireAuth, requireRole("admin"), async (c) => {
  const { key, name, dataSourceUrl, fieldDefinitions, isActive } =
    await c.req.json<GameInput>();

  if (!key?.trim() || !name?.trim() || !dataSourceUrl?.trim()) {
    return c.json(
      { success: false, message: "key, name, and dataSourceUrl are required." },
      400,
    );
  }

  try {
    const [row] = await db
      .insert(games)
      .values({
        key: key.trim(),
        name: name.trim(),
        dataSourceUrl: dataSourceUrl.trim(),
        fieldDefinitions,
        isActive: isActive ?? true,
      })
      .returning();
    return c.json({ success: true, data: toGame(row) });
  } catch (err) {
    if (err instanceof Error && /unique/i.test(err.message)) {
      return c.json(
        { success: false, message: `A game with key "${key}" already exists.` },
        409,
      );
    }
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:guid", requireAuth, requireRole("admin"), async (c) => {
  const guid = c.req.param("guid");
  const { key, name, dataSourceUrl, fieldDefinitions, isActive } =
    await c.req.json<Partial<GameInput>>();

  try {
    const target = await db.query.games.findFirst({
      where: (t, { eq }) => eq(t.guid, guid),
      columns: { id: true },
    });
    if (!target)
      return c.json({ success: false, message: "Game not found." }, 404);

    const updates: Partial<typeof games.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (key !== undefined) updates.key = key.trim();
    if (name !== undefined) updates.name = name.trim();
    if (dataSourceUrl !== undefined)
      updates.dataSourceUrl = dataSourceUrl.trim();
    if (fieldDefinitions !== undefined)
      updates.fieldDefinitions = fieldDefinitions;
    if (isActive !== undefined) updates.isActive = isActive;

    const [row] = await db
      .update(games)
      .set(updates)
      .where(eq(games.id, target.id))
      .returning();
    return c.json({ success: true, data: toGame(row) });
  } catch (err) {
    if (err instanceof Error && /unique/i.test(err.message)) {
      return c.json(
        { success: false, message: `A game with key "${key}" already exists.` },
        409,
      );
    }
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:guid", requireAuth, requireRole("admin"), async (c) => {
  const guid = c.req.param("guid");
  try {
    const target = await db.query.games.findFirst({
      where: (t, { eq }) => eq(t.guid, guid),
      columns: { id: true },
    });
    if (!target)
      return c.json({ success: false, message: "Game not found." }, 404);

    await db.delete(games).where(eq(games.id, target.id));
    return c.json({ success: true, data: null });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as gamesRouter };
