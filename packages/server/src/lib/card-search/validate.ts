import type { Response } from "@magic-vault/shared";
import { QUERY_MIN_LENGTH } from "@magic-vault/shared";

export function validateQuery(query: string): Response | null {
  if (!query || query.trim().length < QUERY_MIN_LENGTH) {
    return {
      message: `Your query must be greater than ${QUERY_MIN_LENGTH}`,
      success: false,
    };
  }
  return null;
}
