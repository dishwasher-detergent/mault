"use server";

import { db } from "@/db";
import { SearchCardMatch } from "@/interfaces/api.interface";
import { Result } from "@/interfaces/result.interface";
import { vectorizeImageFromBuffer } from "@/lib/vectorize";
import { sql } from "drizzle-orm";

export async function Search(
  formData: FormData,
): Promise<Result<SearchCardMatch | null>> {
  const file = formData.get("image");

  if (!file || !(file instanceof File)) {
    return {
      message: "No image provided.",
      success: false,
    };
  }

  if (!file.type.startsWith("image/")) {
    return {
      message: "Uploaded file is not an image.",
      success: false,
    };
  }

  let embedding: number[];
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    embedding = await vectorizeImageFromBuffer(buffer);
  } catch (err) {
    return {
      message: "Failed to vectorize image.",
      success: false,
    };
  }

  const embeddingStr = `[${embedding.join(",")}]`;

  const matches = await db.execute(sql`
					SELECT
						id,
						scryfall_id,
						embedding <=> ${embeddingStr}::vector(768) AS distance
					FROM card_image_vectors
					WHERE (embedding <=> ${embeddingStr}::vector(768)) < 0.2
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
}
