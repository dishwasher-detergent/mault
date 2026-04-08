import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { neon } from "@/lib/auth/client";
import type { SyncState } from "@magic-vault/shared";

export interface AdminCard {
  id: number;
  scryfallId: string;
  name: string;
  setCode: string;
  updatedAt: string;
}

export interface AdminCardsPage {
  cards: AdminCard[];
  total: number;
  page: number;
  limit: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function startSync(): Promise<{
  success: boolean;
  data: SyncState;
}> {
  return apiPost<{ success: boolean; data: SyncState }>("/api/admin/sync");
}

export async function cancelSync(): Promise<{
  success: boolean;
  data: SyncState;
}> {
  return apiDelete<{ success: boolean; data: SyncState }>("/api/admin/sync");
}

export async function getSyncStatus(): Promise<{
  success: boolean;
  data: SyncState;
}> {
  return apiGet<{ success: boolean; data: SyncState }>("/api/admin/sync");
}

export async function dumpCards(): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>("/api/admin/cards/dump");
}

export async function listCards(
  page: number,
  search: string,
): Promise<{ success: boolean; data: AdminCardsPage }> {
  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (search) params.set("search", search);
  return apiGet<{ success: boolean; data: AdminCardsPage }>(`/api/admin/cards?${params}`);
}

export async function revectorizeCard(
  scryfallId: string,
): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>(
    `/api/admin/cards/${encodeURIComponent(scryfallId)}/revectorize`,
  );
}

export async function createSyncEventSource(): Promise<EventSource> {
  const { data } = await neon.auth.getSession();
  const token = (data as { session?: { token?: string } } | null)?.session
    ?.token;
  const url = `${API_BASE}/api/admin/sync/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  return new EventSource(url);
}
