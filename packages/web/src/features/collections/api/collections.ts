import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { Collection, Result, ScannedCard } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export async function loadCollections(): Promise<Result<Collection[]>> {
  return apiGet<Result<Collection[]>>("/api/collections");
}

export const collectionsQueryOptions = queryOptions({
  queryKey: ["collections"] as const,
  queryFn: () => loadCollections().then((r) => r.data ?? []),
  staleTime: Infinity,
});

export async function createCollection(name: string): Promise<Result<Collection[]>> {
  return apiPost<Result<Collection[]>>("/api/collections", { name });
}

export async function renameCollection(guid: string, name: string): Promise<Result<Collection[]>> {
  return apiPut<Result<Collection[]>>(`/api/collections/${guid}`, { name });
}

export async function activateCollection(guid: string): Promise<Result<Collection[]>> {
  return apiPut<Result<Collection[]>>(`/api/collections/${guid}/active`);
}

export async function deleteCollection(guid: string): Promise<Result<Collection[]>> {
  return apiDelete<Result<Collection[]>>(`/api/collections/${guid}`);
}

export async function loadCollectionCards(guid: string): Promise<Result<ScannedCard[]>> {
  return apiGet<Result<ScannedCard[]>>(`/api/collections/${guid}/cards`);
}

export async function addCollectionCard(
  guid: string,
  record: ScannedCard,
): Promise<Result<ScannedCard>> {
  return apiPost<Result<ScannedCard>>(`/api/collections/${guid}/cards`, record);
}

export async function updateCollectionCard(
  guid: string,
  scanId: string,
  card: ScannedCard["card"],
  binNumber?: number,
): Promise<Result<ScannedCard>> {
  return apiPut<Result<ScannedCard>>(`/api/collections/${guid}/cards/${scanId}`, {
    card,
    binNumber,
  });
}

export async function removeCollectionCard(
  guid: string,
  scanId: string,
): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/cards/${scanId}`);
}

export async function removeCollectionCards(
  guid: string,
  scanIds: string[],
): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/collections/${guid}/cards/remove-bulk`, { scanIds });
}

export async function clearCollectionCards(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/cards`);
}
