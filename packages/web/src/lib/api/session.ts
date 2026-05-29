import { neon } from "@/lib/auth/client";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function getSessionParams(): Promise<URLSearchParams> {
  const { data } = await neon.auth.getSession();
  const session = (data as { session?: { token?: string; activeOrganizationId?: string | null } } | null)?.session;
  const params = new URLSearchParams();
  if (session?.token) params.set("token", session.token);
  const orgId = session?.activeOrganizationId ?? localStorage.getItem("activeOrgId");
  if (orgId) params.set("orgId", orgId);
  return params;
}

export async function createSessionEventSource(collectionGuid: string): Promise<EventSource> {
  const params = await getSessionParams();
  return new EventSource(`${API_BASE}/api/collections/${encodeURIComponent(collectionGuid)}/stream?${params}`);
}

export async function createLockEventsSource(): Promise<EventSource> {
  const params = await getSessionParams();
  return new EventSource(`${API_BASE}/api/collections/lock-events?${params}`);
}
