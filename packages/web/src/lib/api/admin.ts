import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { neon } from "@/lib/auth/client";
import type { SyncState } from "@magic-vault/shared";

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

export async function createSyncEventSource(): Promise<EventSource> {
  const { data } = await neon.auth.getSession();
  const token = (data as { session?: { token?: string } } | null)?.session
    ?.token;
  const url = `${API_BASE}/api/admin/sync/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  return new EventSource(url);
}
