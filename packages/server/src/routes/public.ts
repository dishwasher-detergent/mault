import { count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { cardImageVectors, games } from "../db/schema";
import type { AppEnv } from "../middleware/auth";
import pkg from "../../package.json";

const router = new Hono<AppEnv>();

// GET /public/version — unauthenticated, polled by the web client to prompt a refresh on deploy.
router.get("/version", (c) => {
  return c.json({ success: true, data: { version: pkg.version } });
});

// GET /public/games — unauthenticated, for the marketing/landing page.
router.get("/games", async (c) => {
  try {
    const rows = await db
      .select({ key: games.key, name: games.name })
      .from(games)
      .where(eq(games.isActive, true))
      .orderBy(games.name);

    const countRows = await db
      .select({ gameKey: cardImageVectors.gameKey, count: count() })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey);
    const countByKey = new Map(countRows.map((r) => [r.gameKey, r.count]));

    const data = rows.map((row) => ({
      ...row,
      cardCount: countByKey.get(row.key) ?? 0,
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as publicRouter };
