import type { Result, ScryfallCard } from "@magic-vault/shared";
import { apiGet } from "@/lib/api/client";

export async function Search(query: string): Promise<Result<ScryfallCard[]>> {
  const params = new URLSearchParams({ q: query });
  return apiGet<Result<ScryfallCard[]>>(`/api/cards/scryfall?${params}`);
}

export async function SearchById(id: string): Promise<Result<ScryfallCard>> {
  return apiGet<Result<ScryfallCard>>(`/api/cards/scryfall/${id}`);
}
