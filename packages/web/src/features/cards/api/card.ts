import type { Result, SearchCardMatch } from "@magic-vault/shared";
import { apiPostForm } from "@/lib/api/client";

export async function Search(formData: FormData): Promise<Result<SearchCardMatch | null>> {
  return apiPostForm<Result<SearchCardMatch | null>>("/api/cards", formData);
}
