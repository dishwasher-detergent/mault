import type { SearchCardMatch } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../db";
import { sendDiscordNotification } from "../lib/discord";
import { Search, SearchById } from "../lib/scryfall/search";
import { vectorizeImageFromBuffer } from "../lib/vectorize";
import { requireAuth, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

router.post("/", requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const file = body["image"];

  if (!file || typeof file === "string") {
    return c.json({ success: false, message: "No image provided." }, 400);
  }

  if (!file.type.startsWith("image/")) {
    return c.json(
      { success: false, message: "Uploaded file is not an image." },
      400,
    );
  }

  let embedding: number[];
  try {
    embedding = await vectorizeImageFromBuffer(
      Buffer.from(await file.arrayBuffer()),
    );
  } catch (err) {
    console.error(err);
    return c.json(
      { success: false, message: "Failed to vectorize image." },
      500,
    );
  }

  const embeddingStr = `[${embedding.join(",")}]`;

  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const matches = await tx.execute(sql`
        SELECT
          scryfall_id,
          embedding <=> ${embeddingStr}::vector(768) AS distance
        FROM cards
        WHERE (embedding <=> ${embeddingStr}::vector(768)) < 0.3
        ORDER BY embedding <=> ${embeddingStr}::vector(768)
        LIMIT 5
      `);

      const matchList: SearchCardMatch[] = matches.rows.map((row) => ({
        id: row.scryfall_id as string,
        scryfallId: row.scryfall_id as string,
        distance: row.distance as number,
      }));

      return {
        message: "Successfully searched for card.",
        success: true,
        data: matchList.length > 0 ? matchList : null,
      };
    });

    return c.json(result);
  } catch (err) {
    console.error(err);
    const orgId = c.req.header("X-Org-Id");
    if (orgId) {
      void sendDiscordNotification(orgId, {
        title: "Magic Vault — Card Search Error",
        description: "A database error occurred while searching for a card.",
        color: 0xed4245,
        timestamp: new Date().toISOString(),
      });
    }
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// /scryfall must be registered before /scryfall/:id to avoid path conflicts
router.get("/scryfall", requireAuth, async (c) => {
  const query = c.req.query("q") ?? "";
  const result = await Search(query);
  return c.json(result);
});

router.get("/scryfall/:id", requireAuth, async (c) => {
  const result = await SearchById(c.req.param("id"));
  return c.json(result);
});

export { router as cardRouter };
