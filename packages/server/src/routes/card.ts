import type { Response } from "express";
import { Router } from "express";
import multer from "multer";
import { authQuery } from "../db";
import type { SearchCardMatch } from "@magic-vault/shared";
import { vectorizeImageFromBuffer } from "../lib/vectorize";
import { SearchById } from "../lib/scryfall/search";
import { sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post(
  "/search",
  requireAuth,
  upload.single("image"),
  async (req: AuthenticatedRequest, res: Response) => {
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: "No image provided." });
      return;
    }

    if (!file.mimetype.startsWith("image/")) {
      res.status(400).json({ success: false, message: "Uploaded file is not an image." });
      return;
    }

    let embedding: number[];
    try {
      embedding = await vectorizeImageFromBuffer(file.buffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to vectorize image." });
      return;
    }

    const embeddingStr = `[${embedding.join(",")}]`;

    try {
      const result = await authQuery(req.jwtClaims!, async (tx) => {
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

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Database error." });
    }
  },
);

router.get(
  "/scryfall/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await SearchById(req.params.id);
    res.json(result);
  },
);

router.get(
  "/scryfall/search",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { Search } = await import("../lib/scryfall/search");
    const query = req.query.q as string;
    const result = await Search(query);
    res.json(result);
  },
);

export { router as cardRouter };
