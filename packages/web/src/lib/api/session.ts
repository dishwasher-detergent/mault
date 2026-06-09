import { API_BASE } from "@/lib/api/client";
import { getAuthSession, getOrgId } from "@/lib/auth/session";

async function getSessionParams(): Promise<URLSearchParams> {
  const session = await getAuthSession();
  const params = new URLSearchParams();
  if (session?.token) params.set("token", session.token);
  const orgId = getOrgId(session);
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
