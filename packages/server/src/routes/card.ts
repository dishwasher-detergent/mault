import { Hono } from "hono";
import { authQuery } from "../db";
import type { SearchCardMatch } from "@magic-vault/shared";
import { vectorizeImageFromBuffer } from "../lib/vectorize";
import { SearchById, Search } from "../lib/scryfall/search";
import { sql } from "drizzle-orm";
import { requireAuth, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

router.post("/", requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const file = body["image"];

  if (!file || typeof file === "string") {
    return c.json({ success: false, message: "No image provided." }, 400);
  }

  if (!file.type.startsWith("image/")) {
    return c.json({ success: false, message: "Uploaded file is not an image." }, 400);
  }

  let embedding: number[];
  try {
    embedding = await vectorizeImageFromBuffer(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Failed to vectorize image." }, 500);
  }

  const embeddingStr = `[${embedding.join(",")}]`;

  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const matches = await tx.execute(sql`
        SELECT
          id,
          scryfall_id,
          embedding <=> ${embeddingStr}::vector(768) AS distance
        FROM cards
        WHERE (embedding <=> ${embeddingStr}::vector(768)) < 0.15
        ORDER BY embedding <=> ${embeddingStr}::vector(768)
        LIMIT 1
      `);

      const match: SearchCardMatch | null =
        matches.rows.length > 0 && matches.rows[0]
          ? {
              id: matches.rows[0].scryfall_id as string,
              scryfallId: matches.rows[0].scryfall_id as string,
              distance: matches.rows[0].distance as number,
            }
          : null;

      return {
        message: "Successfully searched for card.",
        success: true,
        data: match,
      };
    });

    return c.json(result);
  } catch (err) {
    console.error(err);
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
