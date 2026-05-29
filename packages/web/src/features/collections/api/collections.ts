import { apiDelete, apiGet, apiPost, apiPut, getAuthHeaders } from "@/lib/api/client";
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

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function addCollectionCard(
  guid: string,
  record: ScannedCard,
): Promise<Result<ScannedCard>> {
  const res = await fetch(`${API_BASE}/api/collections/${guid}/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify(record),
  });
  // Return body for both success and 423 (locked)
  if (res.ok || res.status === 423) return res.json();
  throw new Error(`API error: ${res.status}`);
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

export async function getLiveSessionCounts(): Promise<Result<Record<string, number>>> {
  return apiGet<Result<Record<string, number>>>("/api/collections/live");
}

export async function releaseScanLock(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/scan-lock`);
}

export interface SessionViewer {
  userId: string;
  displayName: string;
}

export async function getCollectionViewers(guid: string): Promise<SessionViewer[]> {
  const result = await apiGet<Result<SessionViewer[]>>(`/api/collections/${guid}/viewers`);
  return result.data ?? [];
}

export async function getAllSessionViewers(): Promise<Record<string, SessionViewer[]>> {
  const result = await apiGet<Result<Record<string, SessionViewer[]>>>("/api/collections/viewers");
  return result.data ?? {};
}
