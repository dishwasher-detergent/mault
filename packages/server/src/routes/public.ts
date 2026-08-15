import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { games } from "../db/schema";
import type { AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

// GET /public/games — unauthenticated, for the marketing/landing page.
router.get("/games", async (c) => {
  try {
    const rows = await db
      .select({ key: games.key, name: games.name })
      .from(games)
      .where(eq(games.isActive, true))
      .orderBy(games.name);
    return c.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as publicRouter };
